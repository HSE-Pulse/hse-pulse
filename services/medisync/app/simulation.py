from __future__ import annotations

import asyncio
import logging
import os
from collections import deque
from dataclasses import dataclass, field
from typing import Optional

import numpy as np
import torch

# ---------------------------------------------------------------------------
# DES ENGINE — hospital_env.py (NOT modified, used as-is)
# ---------------------------------------------------------------------------
from app.config import (
    DEPARTMENTS,
    CURRICULUM_STAGES,
    CONSTRAINED_STAFFING,
    GENEROUS_STAFFING,
    BASE_SERVICE_TIME,
    CAPACITY,
    MIN_STAFF,
    MAX_STAFF,
    HYPERPARAMS,
)
from app.data_loader import load_json_data, generate_synthetic_data
from app.hospital_env import HospitalEnv

# ---------------------------------------------------------------------------
# MARL INFERENCE — maddpg.py / mappo.py (NOT modified, inference-only)
# ---------------------------------------------------------------------------
from app.maddpg import MADDPGAgent
from app.mappo import MAPPOAgent

from app.schemas import (
    SimState,
    AlgoName,
    PolicyMode,
    DepartmentSnapshot,
    DepartmentMetrics,
    TotalsSnapshot,
    MetaSnapshot,
    TickSnapshot,
    StepMetrics,
    DESEvent,
    MetricsHistory,
    ParamUpdate,
    StaffingOverride,
)

logger = logging.getLogger("medisync.simulation")

# Playback delay per step (seconds) indexed by speed 1-6
SPEED_DELAYS = {
    1: 0.200,
    2: 0.100,
    3: 0.050,
    4: 0.020,
    5: 0.010,
    6: 0.0,
}

DECISION_INTERVAL = 12  # steps between policy queries (= 1 sim-hour)


# ---------------------------------------------------------------------------
# Smoothing helper
# ---------------------------------------------------------------------------

def _smooth(values: list, window: int = 12) -> list:
    """Simple centred rolling mean."""
    if not values:
        return []
    n = len(values)
    out = []
    hw = window // 2
    for i in range(n):
        lo = max(0, i - hw)
        hi = min(n, i + hw + 1)
        out.append(float(np.mean(values[lo:hi])))
    return out


@dataclass
class _Mutation:
    """Queued parameter change applied at the start of the next step."""
    target: str
    value: object


class SimulationManager:
    """Wraps HospitalEnv + policy agents for live interactive simulation."""

    def __init__(self) -> None:
        # ----- DES Engine (hospital_env.py) -----
        self.env: Optional[HospitalEnv] = None
        self.df = None

        # ----- MARL Inference (maddpg.py / mappo.py — weights frozen) -----
        self.agents: dict[str, object] = {}
        self.active_policy: PolicyMode = PolicyMode.MAPPO
        self.deterministic: bool = True

        # Playback state
        self.state: SimState = SimState.IDLE
        self.speed: int = 2
        self._pause_event: asyncio.Event = asyncio.Event()
        self._pause_event.set()
        self._tick_task: Optional[asyncio.Task] = None

        # Action caching (12-step hold)
        self._current_actions: dict[str, np.ndarray] = {}
        self._step_in_cycle: int = 0

        # Mutation queue
        self._pending_mutations: list[_Mutation] = []
        self._mutation_lock: asyncio.Lock = asyncio.Lock()

        # ----- WebSocket subscribers -----
        self.subscribers: set = set()
        self.metrics_subscribers: set = set()

        # ----- Snapshot & metrics history -----
        self.snapshot_history: list[dict] = []
        self._metrics_history: list[dict] = []
        self._des_event_log: list[dict] = []

        # Episode config
        self.episode_hours: int = HYPERPARAMS["episode_hours"]
        self.seed: int = 42

        # Current curriculum stage
        self._stage_index: int = 5
        self._stage_name: str = "Stage 5: Full Difficulty"

        # ----- DES pre-step state capture -----
        self._pre: dict = {}

    # ------------------------------------------------------------------
    # Backward-compat: existing routes reference active_algo (AlgoName).
    # ------------------------------------------------------------------

    @property
    def active_algo(self) -> AlgoName:
        if self.active_policy == PolicyMode.BASELINE:
            return AlgoName.MAPPO
        return AlgoName(self.active_policy.value)

    @active_algo.setter
    def active_algo(self, value: AlgoName) -> None:
        self.active_policy = PolicyMode(value.value)

    # ------------------------------------------------------------------
    # Initialisation helpers
    # ------------------------------------------------------------------

    def load_data(
        self,
        data_dir: str = "./app/data",
        max_patients: Optional[int] = None,
        use_synthetic: bool = False,
        synthetic_patients: int = 1000,
    ) -> int:
        if use_synthetic:
            self.df = generate_synthetic_data(n_patients=synthetic_patients, seed=self.seed)
        else:
            self.df = load_json_data(data_dir, max_patients)
        return len(self.df)

    def create_env(self, episode_hours: int = 168, seed: int = 42) -> None:
        self.episode_hours = episode_hours
        self.seed = seed
        self.env = HospitalEnv(
            self.df,
            episode_hours=episode_hours,
            seed=seed,
        )
        stage = CURRICULUM_STAGES[-1]
        self.env.set_stage(stage)
        self._stage_index = 5
        self._stage_name = stage.name

    def load_checkpoints(self, checkpoint_dir: str) -> list[str]:
        loaded: list[str] = []
        obs_dims = {d: self.env.obs_dim_per_agent for d in DEPARTMENTS}
        act_dims = {d: self.env.action_dim_per_agent for d in DEPARTMENTS}

        maddpg_path = os.path.join(checkpoint_dir, "maddpg_best.pt")
        if os.path.isfile(maddpg_path):
            agent = MADDPGAgent(DEPARTMENTS, obs_dims, act_dims)
            agent.load(maddpg_path)
            self._freeze_weights(agent, "maddpg")
            self.agents["maddpg"] = agent
            loaded.append("maddpg")
            logger.info("Loaded & froze MADDPG checkpoint from %s", maddpg_path)

        mappo_path = os.path.join(checkpoint_dir, "mappo_best.pt")
        if os.path.isfile(mappo_path):
            agent = MAPPOAgent(DEPARTMENTS, obs_dims, act_dims)
            agent.load(mappo_path)
            self._freeze_weights(agent, "mappo")
            self.agents["mappo"] = agent
            loaded.append("mappo")
            logger.info("Loaded & froze MAPPO checkpoint from %s", mappo_path)

        return loaded

    @staticmethod
    def _freeze_weights(agent, algo_name: str) -> None:
        """Set all networks to eval mode and disable gradients."""
        if algo_name == "maddpg":
            for name in agent.agent_names:
                agent.actors[name].eval()
                for p in agent.actors[name].parameters():
                    p.requires_grad = False
            agent.critic.eval()
            for p in agent.critic.parameters():
                p.requires_grad = False
        elif algo_name == "mappo":
            for name in agent.agent_names:
                agent.actors[name].eval()
                for p in agent.actors[name].parameters():
                    p.requires_grad = False
            agent.critic.eval()
            for p in agent.critic.parameters():
                p.requires_grad = False
        logger.info("Weights frozen for %s — inference only, no training.", algo_name)

    # ------------------------------------------------------------------
    # Playback controls
    # ------------------------------------------------------------------

    async def start(self) -> None:
        if self.env is None:
            raise RuntimeError("Environment not initialised. Call create_env first.")
        if not self.agents and self.active_policy != PolicyMode.BASELINE:
            raise RuntimeError("No checkpoints loaded. Call load_checkpoints first.")
        if (
            self.active_policy not in (PolicyMode.BASELINE,)
            and self.active_policy.value not in self.agents
        ):
            self.active_policy = PolicyMode(next(iter(self.agents)))

        self.env.reset(seed=self.seed)
        self._current_actions = {d: np.zeros(self.env.action_dim_per_agent) for d in DEPARTMENTS}
        self._step_in_cycle = 0
        self.snapshot_history.clear()
        self._metrics_history.clear()
        self._des_event_log.clear()
        self.state = SimState.RUNNING
        self._pause_event.set()
        self._tick_task = asyncio.create_task(self._tick_loop())

    async def stop(self) -> None:
        if self._tick_task and not self._tick_task.done():
            self._tick_task.cancel()
            try:
                await self._tick_task
            except asyncio.CancelledError:
                pass
        self.state = SimState.IDLE
        self._tick_task = None

    async def reset(self) -> None:
        await self.stop()
        if self.env is not None:
            self.env.reset(seed=self.seed)
            self._current_actions = {d: np.zeros(self.env.action_dim_per_agent) for d in DEPARTMENTS}
        self._step_in_cycle = 0
        self.snapshot_history.clear()
        self._metrics_history.clear()
        self._des_event_log.clear()
        self.state = SimState.IDLE

    def pause(self) -> None:
        if self.state == SimState.RUNNING:
            self.state = SimState.PAUSED
            self._pause_event.clear()

    def resume(self) -> None:
        if self.state == SimState.PAUSED:
            self.state = SimState.RUNNING
            self._pause_event.set()

    def set_speed(self, speed: int) -> None:
        self.speed = max(1, min(6, speed))

    # ------------------------------------------------------------------
    # Runtime parameter mutations
    # ------------------------------------------------------------------

    async def queue_mutation(self, mutation: _Mutation) -> None:
        async with self._mutation_lock:
            self._pending_mutations.append(mutation)

    async def switch_algo(self, algo: AlgoName) -> None:
        await self.switch_policy(PolicyMode(algo.value))

    async def switch_policy(self, policy: PolicyMode) -> None:
        if policy != PolicyMode.BASELINE and policy.value not in self.agents:
            raise ValueError(f"No checkpoint loaded for {policy.value}")
        self.active_policy = policy
        self._step_in_cycle = 0

    def toggle_sampling(self, deterministic: bool) -> None:
        self.deterministic = deterministic

    async def set_stage(self, stage_index: int) -> None:
        idx = max(1, min(5, stage_index)) - 1
        stage = CURRICULUM_STAGES[idx]
        await self.queue_mutation(_Mutation(target="stage", value=stage))
        self._stage_index = idx + 1
        self._stage_name = stage.name

    async def update_params(self, params: ParamUpdate) -> None:
        if params.arrival_rate_multiplier is not None:
            await self.queue_mutation(
                _Mutation(target="arrival_rate", value=params.arrival_rate_multiplier)
            )
        if params.staffing:
            for s in params.staffing:
                await self.queue_mutation(_Mutation(target="staffing", value=s))
        if params.capacity:
            for dept, cap in params.capacity.items():
                await self.queue_mutation(
                    _Mutation(target="capacity", value=(dept, cap))
                )
        if params.base_service_time:
            for dept, svc in params.base_service_time.items():
                await self.queue_mutation(
                    _Mutation(target="service_time", value=(dept, svc))
                )

    # ------------------------------------------------------------------
    # Single-step
    # ------------------------------------------------------------------

    async def step_forward(self) -> Optional[TickSnapshot]:
        if self.env is None:
            return None
        if self.state not in (SimState.PAUSED, SimState.IDLE):
            return None
        snapshot = await self._do_one_step()
        if snapshot:
            await self._broadcast(snapshot)
        return snapshot

    # ------------------------------------------------------------------
    # Core tick loop
    # ------------------------------------------------------------------

    async def _tick_loop(self) -> None:
        try:
            while self.state in (SimState.RUNNING, SimState.PAUSED):
                await self._pause_event.wait()

                snapshot = await self._do_one_step()
                if snapshot is None:
                    break

                await self._broadcast(snapshot)

                delay = SPEED_DELAYS.get(self.speed, 0.1)
                if delay > 0:
                    await asyncio.sleep(delay)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Tick loop error")
            self.state = SimState.IDLE

    async def _do_one_step(self) -> Optional[TickSnapshot]:
        if self.env is None:
            return None

        await self._apply_mutations()

        self._snapshot_pre_step()

        is_decision = self._step_in_cycle == 0
        if is_decision:
            obs = self.env._get_obs()
            if self.active_policy == PolicyMode.BASELINE:
                self._current_actions = {
                    d: np.zeros(self.env.action_dim_per_agent) for d in DEPARTMENTS
                }
            elif self.active_policy == PolicyMode.MADDPG:
                agent = self.agents["maddpg"]
                self._current_actions = agent.select_action(
                    obs, add_noise=not self.deterministic
                )
            else:
                agent = self.agents["mappo"]
                actions, _, _ = agent.select_action(
                    obs, deterministic=self.deterministic
                )
                self._current_actions = actions

        obs, rewards, done, info = self.env.step(self._current_actions)
        self._step_in_cycle = (self._step_in_cycle + 1) % DECISION_INTERVAL

        des_events = self._extract_des_events()

        if done:
            self.state = SimState.DONE

        snapshot = self._build_snapshot(obs, rewards, is_decision)
        self.snapshot_history.append(snapshot.model_dump())

        step_metrics = self._build_step_metrics(obs, rewards, is_decision, des_events)
        self._metrics_history.append(step_metrics.model_dump())
        self._des_event_log.extend([e.model_dump() for e in des_events])

        if done:
            await self._broadcast_metrics_done(step_metrics)
            await self._broadcast_done(snapshot)
        else:
            await self._broadcast_metrics(step_metrics)

        return snapshot

    # ------------------------------------------------------------------
    # DES event extraction
    # ------------------------------------------------------------------

    def _snapshot_pre_step(self) -> None:
        env = self.env
        self._pre = {
            "arrival_idx": env.arrival_idx,
            "queues": {d: list(env.queues[d]) for d in DEPARTMENTS},
            "in_service": {
                d: {pid for pid, _ in env.in_service[d]} for d in DEPARTMENTS
            },
            "discharged_count": len(env.discharged),
            "patient_depts": {
                pid: p["current_dept"] for pid, p in env.patients.items()
            },
            "patient_ids": set(env.patients.keys()),
            "time": env.current_time,
        }

    def _extract_des_events(self) -> list[DESEvent]:
        env = self.env
        pre = self._pre
        events: list[DESEvent] = []
        now = env.current_time

        new_patient_ids = set(env.patients.keys()) - pre["patient_ids"]
        for d_rec in env.discharged[pre["discharged_count"]:]:
            new_patient_ids.add(d_rec["pid"])

        for pid in sorted(new_patient_ids):
            if pid in env.patients:
                dept = env.patients[pid]["current_dept"]
            else:
                dept = "unknown"
            events.append(DESEvent(
                event_type="arrival",
                sim_time=now,
                patient_id=pid,
                department=dept,
            ))

        for d in DEPARTMENTS:
            post_in_svc = {pid for pid, _ in env.in_service[d]}
            newly_serving = post_in_svc - pre["in_service"].get(d, set())
            for pid in sorted(newly_serving):
                events.append(DESEvent(
                    event_type="service_start",
                    sim_time=now,
                    patient_id=pid,
                    department=d,
                ))

        for d in DEPARTMENTS:
            completed = pre["in_service"].get(d, set()) - {
                pid for pid, _ in env.in_service[d]
            }
            for pid in sorted(completed):
                events.append(DESEvent(
                    event_type="service_complete",
                    sim_time=now,
                    patient_id=pid,
                    department=d,
                ))
                if pid in env.patients:
                    new_dept = env.patients[pid]["current_dept"]
                    if new_dept != d:
                        events.append(DESEvent(
                            event_type="transfer",
                            sim_time=now,
                            patient_id=pid,
                            department=new_dept,
                            details={"from": d},
                        ))

        new_discharges = env.discharged[pre["discharged_count"]:]
        for d_rec in new_discharges:
            events.append(DESEvent(
                event_type="discharge",
                sim_time=now,
                patient_id=d_rec["pid"],
                department="Discharge Lounge",
                details={
                    "total_time": d_rec["total_time"],
                    "wait_time": d_rec["wait_time"],
                },
            ))

        return events

    # ------------------------------------------------------------------
    # Step-level metrics
    # ------------------------------------------------------------------

    def _build_step_metrics(
        self,
        obs: dict,
        rewards: dict,
        is_decision: bool,
        des_events: list[DESEvent],
    ) -> StepMetrics:
        dept_metrics: list[DepartmentMetrics] = []
        for d in DEPARTMENTS:
            svc_cap = max(1, int(self.env._service_capacity(d)))
            in_svc = len(self.env.in_service[d])
            dept_metrics.append(DepartmentMetrics(
                department=d,
                queue_length=len(self.env.queues[d]),
                in_service=in_svc,
                avg_wait_minutes=float(self.env._avg_wait(d)),
                avg_acuity=float(self.env._avg_acuity(d)),
                staff={k: int(v) for k, v in self.env.staff[d].items()},
                service_capacity=svc_cap,
                utilization=round(in_svc / svc_cap, 4),
                reward=float(rewards.get(d, 0.0)),
            ))

        metrics = self.env.get_history_metrics()
        totals = TotalsSnapshot(
            discharged=len(self.env.discharged),
            active_patients=len(self.env.patients),
            mean_wait=float(metrics["mean_wait_time"]),
            mean_los=float(metrics["mean_los"]),
            throughput=int(metrics["throughput"]),
        )

        total_reward = float(sum(rewards.get(d, 0.0) for d in DEPARTMENTS))

        return StepMetrics(
            step=self.env.current_step,
            sim_time_minutes=float(self.env.current_time),
            sim_hour=float(self.env.current_time / 60.0),
            sim_day=float(self.env.current_time / 1440.0),
            decision_point=is_decision,
            policy=self.active_policy.value,
            deterministic=self.deterministic,
            total_reward=total_reward,
            departments=dept_metrics,
            events=des_events,
            totals=totals,
            state=self.state,
        )

    async def _apply_mutations(self) -> None:
        async with self._mutation_lock:
            mutations = list(self._pending_mutations)
            self._pending_mutations.clear()

        self._execute_mutations(mutations)

    def force_apply_mutations(self) -> None:
        mutations = list(self._pending_mutations)
        self._pending_mutations.clear()
        self._execute_mutations(mutations)

    def _execute_mutations(self, mutations: list[_Mutation]) -> None:
        for m in mutations:
            try:
                if m.target == "arrival_rate":
                    self.env.arrival_rate_multiplier = float(m.value)
                elif m.target == "staffing":
                    so: StaffingOverride = m.value
                    if so.department in DEPARTMENTS:
                        if so.doctors is not None:
                            self.env.staff[so.department]["doctors"] = max(
                                MIN_STAFF["doctors"], min(MAX_STAFF["doctors"], so.doctors)
                            )
                        if so.nurses is not None:
                            self.env.staff[so.department]["nurses"] = max(
                                MIN_STAFF["nurses"], min(MAX_STAFF["nurses"], so.nurses)
                            )
                        if so.hcws is not None:
                            self.env.staff[so.department]["hcws"] = max(
                                MIN_STAFF["hcws"], min(MAX_STAFF["hcws"], so.hcws)
                            )
                        if so.admins is not None:
                            self.env.staff[so.department]["admins"] = max(
                                MIN_STAFF["admins"], min(MAX_STAFF["admins"], so.admins)
                            )
                elif m.target == "capacity":
                    dept, cap = m.value
                    if dept in DEPARTMENTS:
                        self.env.capacity[dept] = max(1, int(cap))
                elif m.target == "service_time":
                    dept, svc = m.value
                    if dept in DEPARTMENTS:
                        self.env.base_service[dept] = max(1.0, float(svc))
                elif m.target == "stage":
                    self.env.set_stage(m.value)
            except Exception:
                logger.exception("Failed to apply mutation %s", m.target)

    # ------------------------------------------------------------------
    # Snapshot construction
    # ------------------------------------------------------------------

    def _build_snapshot(
        self,
        obs: dict[str, np.ndarray],
        rewards: dict[str, float],
        is_decision: bool,
    ) -> TickSnapshot:
        departments: dict[str, DepartmentSnapshot] = {}
        for d in DEPARTMENTS:
            departments[d] = DepartmentSnapshot(
                queue_len=len(self.env.queues[d]),
                in_service_count=len(self.env.in_service[d]),
                staff={k: int(v) for k, v in self.env.staff[d].items()},
                service_capacity=int(self.env._service_capacity(d)),
                avg_wait=float(self.env._avg_wait(d)),
                avg_acuity=float(self.env._avg_acuity(d)),
                reward=float(rewards.get(d, 0.0)),
                actions=[float(x) for x in self._current_actions.get(d, np.zeros(4))],
                obs=[float(x) for x in obs.get(d, np.zeros(12))],
            )

        metrics = self.env.get_history_metrics()
        totals = TotalsSnapshot(
            discharged=len(self.env.discharged),
            active_patients=len(self.env.patients),
            mean_wait=float(metrics["mean_wait_time"]),
            mean_los=float(metrics["mean_los"]),
            throughput=int(metrics["throughput"]),
        )

        meta = MetaSnapshot(
            algo=self.active_algo.value,
            deterministic=self.deterministic,
            speed=self.speed,
            stage=self._stage_name,
            stage_index=self._stage_index,
            step=self.env.current_step,
            total_steps=self.env.episode_length_steps,
            sim_time_minutes=float(self.env.current_time),
            sim_hour=float(self.env.current_time / 60.0),
            sim_day=float(self.env.current_time / 1440.0),
            decision_point=is_decision,
            state=self.state,
        )

        return TickSnapshot(departments=departments, totals=totals, meta=meta)

    def get_current_snapshot(self) -> Optional[TickSnapshot]:
        if self.env is None:
            return None
        obs = self.env._get_obs()
        rewards = {d: 0.0 for d in DEPARTMENTS}
        return self._build_snapshot(obs, rewards, is_decision=False)

    # ------------------------------------------------------------------
    # Metrics history
    # ------------------------------------------------------------------

    def get_metrics_history(self, window: int = 12) -> MetricsHistory:
        if not self._metrics_history:
            return MetricsHistory(
                steps=[], sim_hours=[], mean_wait=[], mean_los=[],
                throughput=[], total_reward=[],
                queue_lengths={d: [] for d in DEPARTMENTS},
                utilizations={d: [] for d in DEPARTMENTS},
            )

        steps = [m["step"] for m in self._metrics_history]
        sim_hours = [m["sim_hour"] for m in self._metrics_history]
        mean_waits = [m["totals"]["mean_wait"] for m in self._metrics_history]
        mean_los = [m["totals"]["mean_los"] for m in self._metrics_history]
        throughputs = [m["totals"]["throughput"] for m in self._metrics_history]
        rewards = [m["total_reward"] for m in self._metrics_history]

        q_lengths: dict[str, list[int]] = {d: [] for d in DEPARTMENTS}
        utils: dict[str, list[float]] = {d: [] for d in DEPARTMENTS}
        for m in self._metrics_history:
            for dm in m["departments"]:
                d = dm["department"]
                q_lengths[d].append(dm["queue_length"])
                utils[d].append(dm["utilization"])

        return MetricsHistory(
            steps=steps,
            sim_hours=sim_hours,
            mean_wait=_smooth(mean_waits, window),
            mean_los=_smooth(mean_los, window),
            throughput=throughputs,
            total_reward=_smooth(rewards, window),
            queue_lengths={d: vals for d, vals in q_lengths.items()},
            utilizations={d: _smooth(vals, window) for d, vals in utils.items()},
        )

    def get_current_params(self) -> dict:
        if self.env is None:
            return {}
        return {
            "arrival_rate_multiplier": self.env.arrival_rate_multiplier,
            "staffing": {d: dict(self.env.staff[d]) for d in DEPARTMENTS},
            "capacity": dict(self.env.capacity),
            "base_service_time": dict(self.env.base_service),
            "episode_hours": self.episode_hours,
            "stage": self._stage_name,
            "stage_index": self._stage_index,
        }

    @staticmethod
    def get_defaults() -> dict:
        return {
            "departments": list(DEPARTMENTS),
            "constrained_staffing": {d: dict(v) for d, v in CONSTRAINED_STAFFING.items()},
            "generous_staffing": {d: dict(v) for d, v in GENEROUS_STAFFING.items()},
            "capacity": dict(CAPACITY),
            "base_service_time": {d: float(v) for d, v in BASE_SERVICE_TIME.items()},
            "min_staff": dict(MIN_STAFF),
            "max_staff": dict(MAX_STAFF),
            "curriculum_stages": [
                {
                    "index": i + 1,
                    "name": s.name,
                    "acuity_range": list(s.acuity_range),
                    "max_pathway_length": s.max_pathway_length,
                    "patient_fraction": s.patient_fraction,
                    "staffing_multiplier": s.staffing_multiplier,
                    "arrival_rate_multiplier": s.arrival_rate_multiplier,
                }
                for i, s in enumerate(CURRICULUM_STAGES)
            ],
            "episode_hours": HYPERPARAMS["episode_hours"],
        }

    def get_status(self) -> dict:
        return {
            "state": self.state.value,
            "algo": self.active_policy.value,
            "deterministic": self.deterministic,
            "speed": self.speed,
            "step": self.env.current_step if self.env else 0,
            "total_steps": self.env.episode_length_steps if self.env else 0,
            "episode_hours": self.episode_hours,
        }

    # ------------------------------------------------------------------
    # WebSocket broadcasting
    # ------------------------------------------------------------------

    async def _broadcast(self, snapshot: TickSnapshot) -> None:
        if not self.subscribers:
            return
        data = {"type": "tick", "data": snapshot.model_dump()}
        dead: list = []
        for ws in self.subscribers:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.subscribers.discard(ws)

    async def _broadcast_done(self, final_snapshot: TickSnapshot) -> None:
        if not self.subscribers:
            return
        data = {"type": "done", "data": final_snapshot.model_dump()}
        dead: list = []
        for ws in self.subscribers:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.subscribers.discard(ws)

    async def _broadcast_metrics(self, step_metrics: StepMetrics) -> None:
        if not self.metrics_subscribers:
            return
        data = {"type": "metrics", "data": step_metrics.model_dump()}
        dead: list = []
        for ws in self.metrics_subscribers:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.metrics_subscribers.discard(ws)

    async def _broadcast_metrics_done(self, step_metrics: StepMetrics) -> None:
        if not self.metrics_subscribers:
            return
        data = {"type": "done", "data": step_metrics.model_dump()}
        dead: list = []
        for ws in self.metrics_subscribers:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.metrics_subscribers.discard(ws)

    def subscribe(self, ws) -> None:
        self.subscribers.add(ws)

    def unsubscribe(self, ws) -> None:
        self.subscribers.discard(ws)

    def subscribe_metrics(self, ws) -> None:
        self.metrics_subscribers.add(ws)

    def unsubscribe_metrics(self, ws) -> None:
        self.metrics_subscribers.discard(ws)
