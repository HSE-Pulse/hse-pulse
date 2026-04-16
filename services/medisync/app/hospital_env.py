import numpy as np
import pandas as pd
from collections import deque
from app.config import (DEPARTMENTS, CONSTRAINED_STAFFING, GENEROUS_STAFFING, BASE_SERVICE_TIME,
                    STAFF_COST, CAPACITY, MIN_STAFF, MAX_STAFF, interpolate_staffing)

class HospitalEnv:
    def __init__(self, admissions_df, stage=None, time_step=5, episode_hours=168, seed=42, reward_scale=1.0):
        self.time_step_minutes = time_step
        self.episode_length_steps = int((episode_hours * 60) / time_step)
        self.rng = np.random.RandomState(seed)
        self.stage = stage
        self.reward_scale = reward_scale
        self.full_admissions_df = admissions_df.copy()
        self.admissions_df = admissions_df.copy()
        self.arrival_rate_multiplier = 1.0
        self.staffing = CONSTRAINED_STAFFING
        self.base_service = BASE_SERVICE_TIME
        self.staff_cost = STAFF_COST
        self.capacity = CAPACITY
        self.num_agents = len(DEPARTMENTS)
        self.obs_dim_per_agent = 12
        self.action_dim_per_agent = 4
        self._preprocess()
        self._init_state()

    def set_stage(self, stage):
        self.stage = stage
        df = self.full_admissions_df.copy()

        if stage.acuity_range:
            lo, hi = stage.acuity_range
            df = df[(df['acuity'] >= lo) & (df['acuity'] <= hi)]

        if stage.max_pathway_length:
            df = df[df['pathway_length'] <= stage.max_pathway_length]

        n_patients = max(10, int(len(self.full_admissions_df) * stage.patient_fraction))
        if len(df) > n_patients:
            df = df.sample(n=n_patients, random_state=42).reset_index(drop=True)

        self.admissions_df = df
        self.arrival_rate_multiplier = stage.arrival_rate_multiplier
        self.staffing = interpolate_staffing(stage.staffing_multiplier)
        self._preprocess()

    def _preprocess(self):
        if len(self.admissions_df) == 0:
            return
        self.admissions_df['admittime'] = pd.to_datetime(self.admissions_df['admittime'])
        start = self.admissions_df['admittime'].min()
        self.admissions_df['arrival_minutes'] = (self.admissions_df['admittime'] - start).dt.total_seconds() / 60
        mx = self.admissions_df['arrival_minutes'].max()
        if mx > 0:
            target = (self.episode_length_steps * self.time_step_minutes - 60)
            scale = target / mx / self.arrival_rate_multiplier
            self.admissions_df['arrival_minutes'] *= scale
        self.admissions_df = self.admissions_df.sort_values('arrival_minutes').reset_index(drop=True)

    def _init_state(self):
        self.current_step = 0
        self.current_time = 0.0
        self.queues = {d: [] for d in DEPARTMENTS}
        self.in_service = {d: [] for d in DEPARTMENTS}
        self.staff = {d: self.staffing[d].copy() for d in DEPARTMENTS}
        self.patients = {}
        self.next_pid = 0
        self.discharged = []
        self.discharge_hist = {d: deque(maxlen=12) for d in DEPARTMENTS}
        self.momentum = {d: {s: 0. for s in ['doctors', 'nurses', 'hcws', 'admins']} for d in DEPARTMENTS}
        self.accum = {d: {s: 0. for s in ['doctors', 'nurses', 'hcws', 'admins']} for d in DEPARTMENTS}
        self.arrivals = []
        self.arrival_idx = 0

    def reset(self, seed=None):
        if seed:
            self.rng = np.random.RandomState(seed)
        self._init_state()
        self.arrivals = []
        for _, row in self.admissions_df.iterrows():
            if row['arrival_minutes'] < self.episode_length_steps * self.time_step_minutes:
                self.arrivals.append({
                    'time': row['arrival_minutes'],
                    'acuity': row.get('acuity', 0.5),
                    'pathway': row['pathway']
                })
        self.arrivals.sort(key=lambda x: x['time'])
        self.arrival_idx = 0
        return self._get_obs()

    def step(self, actions):
        self._apply_actions(actions)
        self._process_arrivals()
        self._process_service()
        self._advance_queues()
        self.current_step += 1
        self.current_time += self.time_step_minutes
        done = self.current_step >= self.episode_length_steps
        rewards = self._compute_rewards()
        return self._get_obs(), rewards, done, {}

    def _apply_actions(self, actions):
        staff_types = ['doctors', 'nurses', 'hcws', 'admins']
        for d in DEPARTMENTS:
            a = actions[d]
            for i, s in enumerate(staff_types):
                delta = float(a[i])
                self.momentum[d][s] = 0.9 * self.momentum[d][s] + 0.1 * delta
                self.accum[d][s] += self.momentum[d][s]
                if abs(self.accum[d][s]) >= 1.0:
                    change = int(np.sign(self.accum[d][s]))
                    new_val = self.staff[d][s] + change
                    new_val = max(MIN_STAFF[s], min(MAX_STAFF[s], new_val))
                    self.staff[d][s] = new_val
                    self.accum[d][s] = 0.0

    def _process_arrivals(self):
        while self.arrival_idx < len(self.arrivals) and self.arrivals[self.arrival_idx]['time'] <= self.current_time:
            arr = self.arrivals[self.arrival_idx]
            pid = self.next_pid
            self.next_pid += 1
            pathway = arr['pathway']
            first_dept = pathway[0] if pathway else 'Emergency Department'
            self.patients[pid] = {
                'acuity': arr['acuity'],
                'pathway': pathway,
                'pathway_idx': 0,
                'current_dept': first_dept,
                'arrival_time': self.current_time,
                'wait_start': self.current_time,
                'total_wait': 0.0,
                'service_start': None,
            }
            self.queues[first_dept].append(pid)
            self.arrival_idx += 1

    def _process_service(self):
        for d in DEPARTMENTS:
            completed = []
            for pid, end_time in self.in_service[d]:
                if self.current_time >= end_time:
                    completed.append(pid)
            for pid in completed:
                self.in_service[d] = [(p, t) for p, t in self.in_service[d] if p != pid]
                self._complete_service(pid, d)

    def _complete_service(self, pid, dept):
        if pid not in self.patients:
            return
        p = self.patients[pid]
        p['pathway_idx'] += 1

        if p['pathway_idx'] >= len(p['pathway']):
            total_time = self.current_time - p['arrival_time']
            self.discharged.append({
                'pid': pid,
                'total_time': total_time,
                'wait_time': p['total_wait'],
                'discharge_time': self.current_time
            })
            self.discharge_hist[dept].append(pid)
            del self.patients[pid]
        else:
            next_dept = p['pathway'][p['pathway_idx']]
            p['current_dept'] = next_dept
            p['wait_start'] = self.current_time
            p['service_start'] = None
            self.queues[next_dept].append(pid)

    def _advance_queues(self):
        for d in DEPARTMENTS:
            cap = self._service_capacity(d)
            while self.queues[d] and len(self.in_service[d]) < cap:
                pid = self.queues[d].pop(0)
                if pid not in self.patients:
                    continue
                p = self.patients[pid]
                wait = self.current_time - p['wait_start']
                p['total_wait'] += wait
                p['service_start'] = self.current_time
                svc_time = self._compute_service_time(d, p['acuity'])
                self.in_service[d].append((pid, self.current_time + svc_time))

    def _service_capacity(self, dept):
        s = self.staff[dept]
        return int(s['doctors'] * 1.5 + s['nurses'] * 0.8 + s['hcws'] * 0.3)

    def _compute_service_time(self, dept, acuity):
        base = self.base_service[dept]
        s = self.staff[dept]

        doc_factor = 0.35 * np.log2(1 + s['doctors'])
        nurse_factor = 0.20 * np.log2(1 + s['nurses'])
        hcw_factor = 0.10 * np.log2(1 + s['hcws'])
        staff_factor = max(0.5, 0.3 + doc_factor + nurse_factor + hcw_factor)

        acuity_factor = 0.7 + 0.6 * acuity

        svc_time = (base / staff_factor) * acuity_factor

        svc_time *= self.rng.lognormal(0, 0.15)

        return max(svc_time, self.time_step_minutes * 2)

    def _compute_rewards(self):
        rewards = {}
        baseline_cost = 37.5

        for d in DEPARTMENTS:
            num_waiting = len(self.queues[d])
            num_in_service = len(self.in_service[d])
            service_cap = self._service_capacity(d)

            wait_penalty = 0.0
            if num_waiting > 0:
                for pid in self.queues[d]:
                    if pid in self.patients:
                        wait_min = (self.current_time - self.patients[pid]['wait_start']) / 15.0
                        wait_penalty += wait_min ** 2
                wait_penalty = wait_penalty / num_waiting

            q_ratio = num_waiting / self.capacity[d]
            queue_penalty = 10.0 * ((q_ratio - 0.5) ** 3) if q_ratio > 0.5 else 0.0

            idle_penalty = 0.0
            if service_cap > 0 and num_waiting > 0 and num_in_service > 0:
                util = num_in_service / service_cap
                if util < 0.7:
                    idle_penalty = 3.0 * (1.0 - util)

            discharges = len(self.discharge_hist[d])
            throughput_bonus = min(discharges * 0.2, 2.0)
            self.discharge_hist[d].clear()

            staff_cost = sum(self.staff[d][s] * self.staff_cost[s] for s in self.staff_cost)
            cost_ratio = staff_cost / baseline_cost
            if cost_ratio < 0.8:
                cost_penalty = 10.0 * (0.8 - cost_ratio) ** 2
            elif cost_ratio > 1.2:
                cost_penalty = 5.0 * (cost_ratio - 1.2) ** 2
            else:
                cost_penalty = 2.0 * abs(cost_ratio - 1.0)

            r = (-10.0 * wait_penalty
                 - queue_penalty
                 - 4.0 * idle_penalty
                 + 1.5 * throughput_bonus
                 - 6.0 * cost_penalty)

            r = max(r, -100.0) * self.reward_scale
            rewards[d] = r

        return rewards

    def _get_obs(self):
        obs = {}
        for d in DEPARTMENTS:
            s = self.staff[d]
            obs[d] = np.array([
                len(self.queues[d]) / self.capacity[d],
                len(self.in_service[d]) / max(1, self._service_capacity(d)),
                s['doctors'] / MAX_STAFF['doctors'],
                s['nurses'] / MAX_STAFF['nurses'],
                s['hcws'] / MAX_STAFF['hcws'],
                s['admins'] / MAX_STAFF['admins'],
                self._avg_wait(d) / 60.0,
                self._avg_acuity(d),
                self.current_step / self.episode_length_steps,
                self._service_capacity(d) / 20.0,
                len(self.discharged) / max(1, len(self.arrivals)),
                self._queue_trend(d),
            ], dtype=np.float32)
        return obs

    def _avg_wait(self, dept):
        if not self.queues[dept]:
            return 0.0
        waits = []
        for pid in self.queues[dept]:
            if pid in self.patients:
                waits.append(self.current_time - self.patients[pid]['wait_start'])
        return np.mean(waits) if waits else 0.0

    def _avg_acuity(self, dept):
        acuities = []
        for pid in self.queues[dept]:
            if pid in self.patients:
                acuities.append(self.patients[pid]['acuity'])
        for pid, _ in self.in_service[dept]:
            if pid in self.patients:
                acuities.append(self.patients[pid]['acuity'])
        return np.mean(acuities) if acuities else 0.5

    def _queue_trend(self, dept):
        return min(1.0, max(-1.0, (len(self.queues[dept]) - 10) / 20.0))

    def get_history_metrics(self):
        if not self.discharged:
            return {'mean_wait_time': 0, 'mean_los': 0, 'throughput': 0}
        waits = [d['wait_time'] for d in self.discharged]
        los = [d['total_time'] for d in self.discharged]
        return {
            'mean_wait_time': np.mean(waits),
            'mean_los': np.mean(los),
            'throughput': len(self.discharged)
        }
