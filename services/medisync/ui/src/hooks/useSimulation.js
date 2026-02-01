import { useState, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import * as api from '../api/client';
import { DEPARTMENTS } from '../utils/constants';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function processMetrics(data) {
  const point = {
    step: data.step,
    simHour: data.sim_hour,
    simDay: data.sim_day,
    totalReward: data.total_reward,
    meanWait: data.totals.mean_wait,
    meanLos: data.totals.mean_los,
    throughput: data.totals.throughput,
    discharged: data.totals.discharged,
    activePatients: data.totals.active_patients,
    decisionPoint: data.decision_point,
    policy: data.policy,
    queues: {},
    utilizations: {},
    waits: {},
    staff: {},
    rewards: {},
    events: data.events || [],
  };
  for (const dept of data.departments) {
    point.queues[dept.department] = dept.queue_length;
    point.utilizations[dept.department] = dept.utilization;
    point.waits[dept.department] = dept.avg_wait_minutes;
    point.staff[dept.department] = { ...dept.staff };
    point.rewards[dept.department] = dept.reward;
  }
  return point;
}

function generateInsights(latest, prev) {
  if (!latest) return [];
  const insights = [];

  for (const dept of DEPARTMENTS) {
    const q = latest.queues[dept] || 0;
    const u = latest.utilizations[dept] || 0;
    const w = latest.waits[dept] || 0;

    if (u > 0.9 && q > 0) {
      insights.push({
        type: 'warning',
        dept,
        text: `${dept} at ${(u * 100).toFixed(0)}% capacity with ${q} queued`,
      });
    }
    if (w > 120) {
      insights.push({
        type: 'alert',
        dept,
        text: `${dept}: avg wait ${w.toFixed(0)} min (> 2 hours)`,
      });
    }
    if (prev) {
      const prevQ = prev.queues[dept] || 0;
      if (q > prevQ * 1.5 && q > 5 && q - prevQ > 3) {
        insights.push({
          type: 'spike',
          dept,
          text: `Queue spike in ${dept}: ${prevQ} -> ${q}`,
        });
      }
    }
  }

  const icuQ = latest.queues['ICU'] || 0;
  if (icuQ > 10) {
    insights.push({
      type: 'critical',
      dept: 'ICU',
      text: `This queue spike is caused by ICU transfer backlog (${icuQ} patients waiting)`,
    });
  }
  return insights;
}

function buildSummary(points) {
  if (points.length === 0) return null;
  const last = points[points.length - 1];
  const avgReward = points.reduce((s, p) => s + p.totalReward, 0) / points.length;
  return {
    totalSteps: points.length,
    finalThroughput: last.throughput,
    finalMeanWait: last.meanWait,
    finalMeanLos: last.meanLos,
    avgReward,
    discharged: last.discharged,
    activePatients: last.activePatients,
    policy: last.policy,
    simDays: last.simDay,
  };
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function useSimulation() {
  const [status, setStatus] = useState({
    state: 'idle',
    algo: 'mappo',
    deterministic: true,
    speed: 2,
    step: 0,
    total_steps: 0,
    episode_hours: 168,
  });

  const [dataPoints, setDataPoints] = useState([]);
  const [latestPoint, setLatestPoint] = useState(null);
  const [insights, setInsights] = useState([]);
  const [summary, setSummary] = useState(null);
  const [comparisonRun, setComparisonRun] = useState(null);
  const [comparisonState, setComparisonState] = useState('idle');
  const [error, setError] = useState(null);

  const prevPointRef = useRef(null);
  const dataPointsRef = useRef([]);
  const doneResolverRef = useRef(null);

  /* ---------- WebSocket message handler ---------- */

  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'status':
        setStatus((prev) => ({ ...prev, ...msg.data }));
        break;

      case 'metrics': {
        const point = processMetrics(msg.data);
        dataPointsRef.current = [...dataPointsRef.current, point];
        setDataPoints(dataPointsRef.current);
        setLatestPoint(point);
        setInsights(generateInsights(point, prevPointRef.current));
        prevPointRef.current = point;
        setStatus((prev) => ({
          ...prev,
          state: msg.data.state,
          step: msg.data.step,
          algo: msg.data.policy,
          deterministic: msg.data.deterministic,
        }));
        break;
      }

      case 'done': {
        // done can arrive as StepMetrics (from _broadcast_metrics_done)
        // or as TickSnapshot (from _broadcast_done). Handle both.
        if (msg.data.departments && Array.isArray(msg.data.departments)) {
          // StepMetrics format — process as normal
          const point = processMetrics(msg.data);
          dataPointsRef.current = [...dataPointsRef.current, point];
          setDataPoints(dataPointsRef.current);
          setLatestPoint(point);
        }
        // Always update state and summary
        setSummary(buildSummary(dataPointsRef.current));
        setStatus((prev) => ({
          ...prev,
          state: 'done',
          step: msg.data.step ?? msg.data.meta?.step ?? prev.step,
        }));
        if (doneResolverRef.current) {
          doneResolverRef.current();
          doneResolverRef.current = null;
        }
        break;
      }

      case 'ack':
        if (msg.data.state) {
          setStatus((prev) => ({ ...prev, state: msg.data.state }));
        }
        if (msg.data.speed !== undefined) {
          setStatus((prev) => ({ ...prev, speed: msg.data.speed }));
        }
        break;

      case 'error':
        setError(typeof msg.data === 'string' ? msg.data : JSON.stringify(msg.data));
        setTimeout(() => setError(null), 5000);
        break;

      default:
        break;
    }
  }, []);

  const { connected, send } = useWebSocket(handleMessage);

  /* ---------- Internal helpers ---------- */

  const clearRunData = useCallback(() => {
    dataPointsRef.current = [];
    setDataPoints([]);
    setLatestPoint(null);
    setSummary(null);
    setInsights([]);
    prevPointRef.current = null;
  }, []);

  const waitForDone = useCallback(() => {
    return new Promise((resolve) => {
      doneResolverRef.current = resolve;
    });
  }, []);

  /* ---------- Public actions ---------- */

  const start = useCallback(
    async (params = {}) => {
      const defaults = {
        use_synthetic: false,
        data_dir: './app/data',
        synthetic_patients: 500,
        algo: 'mappo',
        deterministic: true,
        speed: 2,
        episode_hours: 168,
        seed: 42,
      };
      clearRunData();
      try {
        const res = await api.startSimulation({ ...defaults, ...params });
        setStatus(res);
        setError(null);
      } catch (e) {
        setError(e.message);
      }
    },
    [clearRunData],
  );

  const pause = useCallback(() => {
    send({ type: status.state === 'running' ? 'pause' : 'play' });
  }, [send, status.state]);

  const reset = useCallback(async () => {
    clearRunData();
    try {
      const res = await api.resetSimulation();
      setStatus(res);
    } catch (e) {
      setError(e.message);
    }
  }, [clearRunData]);

  const setSpeed = useCallback(
    (speed) => {
      send({ type: 'speed', value: speed });
    },
    [send],
  );

  const switchPolicy = useCallback(async (policy, deterministic = true) => {
    try {
      await api.selectPolicy(policy, deterministic);
      setStatus((prev) => ({ ...prev, algo: policy, deterministic }));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const updateConfig = useCallback(async (config) => {
    try {
      await api.updateConfig(config);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const saveComparison = useCallback(() => {
    if (dataPointsRef.current.length === 0) return;
    const pts = dataPointsRef.current;
    setComparisonRun({
      label: `${pts[pts.length - 1].policy.toUpperCase()} Run`,
      policy: pts[pts.length - 1].policy,
      data: [...pts],
      summary: buildSummary(pts),
    });
  }, []);

  const clearComparison = useCallback(() => {
    setComparisonRun(null);
    setComparisonState('idle');
  }, []);

  const runComparison = useCallback(
    async (params = {}) => {
      setComparisonState('running_a');
      setComparisonRun(null);

      // --- Run A: Baseline ---
      clearRunData();
      try {
        await api.resetSimulation();
        await api.startSimulation({
          use_synthetic: true,
          synthetic_patients: 500,
          episode_hours: 168,
          seed: params.seed || 42,
          algo: 'mappo',
          deterministic: true,
          speed: 1,
          ...params,
        });
        await api.selectPolicy('baseline', true);
        await api.updateConfig({ speed: 6 });
      } catch (e) {
        setError(e.message);
        setComparisonState('idle');
        return;
      }

      await waitForDone();
      const savedBaseline = {
        label: 'Baseline (Fixed Staffing)',
        policy: 'baseline',
        data: [...dataPointsRef.current],
        summary: buildSummary(dataPointsRef.current),
      };

      // --- Run B: MARL ---
      setComparisonState('running_b');
      clearRunData();
      try {
        await api.resetSimulation();
        await api.startSimulation({
          use_synthetic: true,
          synthetic_patients: 500,
          episode_hours: 168,
          seed: params.seed || 42,
          algo: params.algo || 'mappo',
          deterministic: true,
          speed: 6,
          ...params,
        });
      } catch (e) {
        setError(e.message);
        setComparisonState('idle');
        return;
      }

      await waitForDone();
      setComparisonRun(savedBaseline);
      setComparisonState('complete');
    },
    [clearRunData, waitForDone],
  );

  return {
    connected,
    status,
    dataPoints,
    latestPoint,
    insights,
    summary,
    comparisonRun,
    comparisonState,
    error,
    start,
    pause,
    reset,
    setSpeed,
    switchPolicy,
    updateConfig,
    saveComparison,
    clearComparison,
    runComparison,
  };
}
