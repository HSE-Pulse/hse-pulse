import React from 'react';

const ICONS = {
  critical: '\u26A0',
  alert: '\u23F1',
  warning: '\u2B06',
  spike: '\u26A1',
};

const CLASSES = {
  critical: 'insight-critical',
  alert: 'insight-alert',
  warning: 'insight-warning',
  spike: 'insight-spike',
};

export default function InsightsPanel({ insights }) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="insights-panel">
      <h3 className="chart-title">Live Insights</h3>
      <div className="insights-list">
        {insights.slice(0, 6).map((ins, i) => (
          <div key={i} className={`insight-item ${CLASSES[ins.type] || ''}`}>
            <span className="insight-icon">{ICONS[ins.type] || 'i'}</span>
            <span className="insight-text">{ins.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
