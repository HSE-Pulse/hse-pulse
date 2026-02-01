import React, { useState } from 'react';
import {
  DEPARTMENTS,
  DEPT_SHORT,
  STAFF_ROLES,
  STAFF_BOUNDS,
  SPEED_LABELS,
  STAGES,
  POLICIES,
} from '../utils/constants';

export default function ControlPanel({
  status,
  connected,
  onStart,
  onPause,
  onReset,
  onSpeedChange,
  onPolicySwitch,
  onConfigUpdate,
  onSaveComparison,
  onClearComparison,
  onRunComparison,
  comparisonRun,
  comparisonState,
}) {
  const [policy, setPolicy] = useState('mappo');
  const [deterministic, setDeterministic] = useState(true);
  const [speed, setSpeed] = useState(2);
  const [arrivalRate, setArrivalRate] = useState(1.0);
  const [stage, setStage] = useState(5);
  const [seed, setSeed] = useState(42);
  const [useSynthetic, setUseSynthetic] = useState(false);
  const [syntheticPatients, setSyntheticPatients] = useState(500);
  const [showStaffing, setShowStaffing] = useState(false);
  const [staffing, setStaffing] = useState({});

  const isIdle = status.state === 'idle';
  const isRunning = status.state === 'running';
  const isPaused = status.state === 'paused';
  const isDone = status.state === 'done';
  const canStart = isIdle || isDone;
  const canPause = isRunning || isPaused;
  const comparing = comparisonState !== 'idle' && comparisonState !== 'complete';

  const handleStart = () => {
    onStart({
      algo: policy,
      deterministic,
      speed,
      seed,
      use_synthetic: useSynthetic,
      data_dir: './app/data',
      synthetic_patients: syntheticPatients,
      episode_hours: 168,
    });
  };

  const handlePolicyChange = (newPolicy) => {
    setPolicy(newPolicy);
    if (!isIdle && !isDone) {
      onPolicySwitch(newPolicy, deterministic);
    }
  };

  const handleDeterministicToggle = () => {
    const next = !deterministic;
    setDeterministic(next);
    if (!isIdle && !isDone) {
      onPolicySwitch(policy, next);
    }
  };

  const handleSpeedChange = (val) => {
    const v = Number(val);
    setSpeed(v);
    onSpeedChange(v);
  };

  const handleApplyConfig = () => {
    const config = { arrival_rate_multiplier: arrivalRate, stage };
    if (Object.keys(staffing).length > 0) {
      config.staffing = staffing;
    }
    onConfigUpdate(config);
  };

  const handleStaffChange = (dept, role, val) => {
    setStaffing((prev) => ({
      ...prev,
      [dept]: { ...(prev[dept] || {}), [role]: Number(val) },
    }));
  };

  const handleRunComparison = () => {
    onRunComparison({
      seed,
      use_synthetic: useSynthetic,
      data_dir: './app/data',
      synthetic_patients: syntheticPatients,
      algo: policy === 'baseline' ? 'mappo' : policy,
    });
  };

  return (
    <aside className="control-panel">
      <div className="panel-header">
        <h1 className="logo">MediSync</h1>
        <span className={`conn-badge ${connected ? 'on' : 'off'}`}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* --- Simulation Controls --- */}
      <section className="panel-section">
        <h3 className="section-title">Simulation</h3>
        <div className="btn-row">
          <button
            className="btn btn-primary"
            onClick={handleStart}
            disabled={!canStart || comparing}
          >
            Start
          </button>
          <button
            className="btn btn-secondary"
            onClick={onPause}
            disabled={!canPause || comparing}
          >
            {isRunning ? 'Pause' : 'Resume'}
          </button>
          <button
            className="btn btn-danger"
            onClick={onReset}
            disabled={isIdle || comparing}
          >
            Reset
          </button>
        </div>

        <label className="field">
          <span className="field-label">Seed</span>
          <input
            type="number"
            className="input"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value))}
            disabled={!canStart}
          />
        </label>

        <label className="field">
          <span className="field-label">Data Source</span>
          <select
            className="select"
            value={useSynthetic ? 'synthetic' : 'mimic'}
            onChange={(e) => setUseSynthetic(e.target.value === 'synthetic')}
            disabled={!canStart}
          >
            <option value="mimic">MIMIC-IV (data/)</option>
            <option value="synthetic">Synthetic</option>
          </select>
        </label>

        {useSynthetic && (
        <label className="field">
          <span className="field-label">Synthetic Patients</span>
          <input
            type="number"
            className="input"
            min={50}
            max={5000}
            step={50}
            value={syntheticPatients}
            onChange={(e) => setSyntheticPatients(Number(e.target.value))}
            disabled={!canStart}
          />
        </label>
        )}
      </section>

      {/* --- Policy --- */}
      <section className="panel-section">
        <h3 className="section-title">Policy</h3>
        <div className="radio-group">
          {POLICIES.map((p) => (
            <label key={p.value} className="radio-label">
              <input
                type="radio"
                name="policy"
                value={p.value}
                checked={policy === p.value}
                onChange={() => handlePolicyChange(p.value)}
              />
              <span>{p.label}</span>
            </label>
          ))}
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={deterministic}
            onChange={handleDeterministicToggle}
          />
          <span>Deterministic (greedy)</span>
        </label>
      </section>

      {/* --- Speed --- */}
      <section className="panel-section">
        <h3 className="section-title">
          Speed: {speed} ({SPEED_LABELS[speed]})
        </h3>
        <input
          type="range"
          className="slider"
          min={1}
          max={6}
          step={1}
          value={speed}
          onChange={(e) => handleSpeedChange(e.target.value)}
        />
      </section>

      {/* --- Environment --- */}
      <section className="panel-section">
        <h3 className="section-title">Environment</h3>

        <label className="field">
          <span className="field-label">
            Arrival Rate: {arrivalRate.toFixed(1)}x
          </span>
          <input
            type="range"
            className="slider"
            min={0.1}
            max={3.0}
            step={0.1}
            value={arrivalRate}
            onChange={(e) => setArrivalRate(Number(e.target.value))}
          />
        </label>

        <label className="field">
          <span className="field-label">Difficulty Stage</span>
          <select
            className="select"
            value={stage}
            onChange={(e) => setStage(Number(e.target.value))}
          >
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <button className="btn btn-sm btn-outline" onClick={handleApplyConfig}>
          Apply Config
        </button>
      </section>

      {/* --- Staffing --- */}
      <section className="panel-section">
        <h3
          className="section-title toggle-title"
          onClick={() => setShowStaffing(!showStaffing)}
        >
          Staffing {showStaffing ? '\u25B2' : '\u25BC'}
        </h3>
        {showStaffing && (
          <div className="staffing-grid">
            {DEPARTMENTS.map((dept) => (
              <div key={dept} className="staffing-dept">
                <span className="dept-label">{DEPT_SHORT[dept]}</span>
                {STAFF_ROLES.map((role) => (
                  <label key={role} className="staffing-field">
                    <span className="staffing-role">{role.slice(0, 3)}</span>
                    <input
                      type="number"
                      className="staffing-input"
                      min={STAFF_BOUNDS[role].min}
                      max={STAFF_BOUNDS[role].max}
                      placeholder="-"
                      onChange={(e) =>
                        handleStaffChange(dept, role, e.target.value)
                      }
                    />
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* --- Comparison --- */}
      <section className="panel-section">
        <h3 className="section-title">Comparison</h3>
        {comparisonState === 'idle' && (
          <>
            <button
              className="btn btn-sm btn-outline"
              onClick={onSaveComparison}
              disabled={status.state !== 'done'}
              title="Save current run to compare against the next run"
            >
              Save Run for Comparison
            </button>
            {comparisonRun && (
              <div className="comparison-badge">
                Comparing vs: {comparisonRun.label}
                <button className="btn-inline" onClick={onClearComparison}>
                  Clear
                </button>
              </div>
            )}
            <button
              className="btn btn-sm btn-primary"
              onClick={handleRunComparison}
              disabled={!canStart}
              style={{ marginTop: 6 }}
            >
              Auto Compare: Baseline vs MARL
            </button>
          </>
        )}
        {comparisonState === 'running_a' && (
          <div className="comparison-status">Running Baseline...</div>
        )}
        {comparisonState === 'running_b' && (
          <div className="comparison-status">Running MARL...</div>
        )}
        {comparisonState === 'complete' && (
          <div className="comparison-status done">
            Comparison complete
            <button className="btn-inline" onClick={onClearComparison}>
              Clear
            </button>
          </div>
        )}
      </section>
    </aside>
  );
}
