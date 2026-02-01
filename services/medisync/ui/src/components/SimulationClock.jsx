import React from 'react';

const STATE_LABELS = {
  idle: 'Idle',
  running: 'Running',
  paused: 'Paused',
  done: 'Complete',
};

export default function SimulationClock({ status, latestPoint }) {
  const { state, step, total_steps, episode_hours } = status;
  const progress = total_steps > 0 ? (step / total_steps) * 100 : 0;

  const simHour = latestPoint?.simHour ?? 0;
  const simDay = latestPoint?.simDay ?? 0;
  const dayNum = Math.floor(simDay) + 1;
  const hourInDay = simHour % 24;

  return (
    <div className="sim-clock">
      <div className="clock-left">
        <span className={`state-badge state-${state}`}>
          {STATE_LABELS[state] || state}
        </span>
        <span className="clock-time">
          Day {dayNum} &middot; {hourInDay.toFixed(1)}h
        </span>
        <span className="clock-detail">
          Step {step} / {total_steps} &middot; {episode_hours}h episode
        </span>
      </div>

      <div className="clock-right">
        {latestPoint && (
          <>
            <span className="clock-stat">
              <span className="stat-value">{latestPoint.discharged}</span>
              <span className="stat-label">discharged</span>
            </span>
            <span className="clock-stat">
              <span className="stat-value">{latestPoint.activePatients}</span>
              <span className="stat-label">active</span>
            </span>
            <span className="clock-stat">
              <span className="stat-value">
                {latestPoint.meanWait.toFixed(1)}m
              </span>
              <span className="stat-label">avg wait</span>
            </span>
            <span className="clock-stat">
              <span className="stat-value">
                {latestPoint.totalReward.toFixed(1)}
              </span>
              <span className="stat-label">reward</span>
            </span>
          </>
        )}
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
