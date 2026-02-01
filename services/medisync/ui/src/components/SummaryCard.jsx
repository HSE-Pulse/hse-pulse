import React from 'react';

export default function SummaryCard({ summary, comparisonSummary }) {
  if (!summary) return null;

  const delta = (cur, cmp, lower) => {
    if (cmp == null) return null;
    const diff = cur - cmp;
    const pct = cmp !== 0 ? ((diff / Math.abs(cmp)) * 100).toFixed(1) : 'N/A';
    const better = lower ? diff < 0 : diff > 0;
    return { diff, pct, better };
  };

  const metrics = [
    {
      label: 'Policy',
      value: summary.policy.toUpperCase(),
      cmpValue: comparisonSummary?.policy?.toUpperCase(),
    },
    {
      label: 'Total Discharges',
      value: summary.discharged,
      cmpValue: comparisonSummary?.discharged,
      delta: delta(summary.discharged, comparisonSummary?.discharged, false),
    },
    {
      label: 'Final Throughput',
      value: summary.finalThroughput,
      cmpValue: comparisonSummary?.finalThroughput,
      delta: delta(
        summary.finalThroughput,
        comparisonSummary?.finalThroughput,
        false,
      ),
    },
    {
      label: 'Mean Wait Time',
      value: `${summary.finalMeanWait.toFixed(1)} min`,
      cmpValue: comparisonSummary
        ? `${comparisonSummary.finalMeanWait.toFixed(1)} min`
        : null,
      delta: delta(
        summary.finalMeanWait,
        comparisonSummary?.finalMeanWait,
        true,
      ),
    },
    {
      label: 'Mean LOS',
      value: `${summary.finalMeanLos.toFixed(1)} min`,
      cmpValue: comparisonSummary
        ? `${comparisonSummary.finalMeanLos.toFixed(1)} min`
        : null,
      delta: delta(
        summary.finalMeanLos,
        comparisonSummary?.finalMeanLos,
        true,
      ),
    },
    {
      label: 'Avg Reward / Step',
      value: summary.avgReward.toFixed(2),
      cmpValue: comparisonSummary?.avgReward?.toFixed(2),
      delta: delta(summary.avgReward, comparisonSummary?.avgReward, false),
    },
    {
      label: 'Simulation Days',
      value: summary.simDays?.toFixed(1) ?? '-',
    },
    {
      label: 'Active Patients (final)',
      value: summary.activePatients,
    },
  ];

  return (
    <div className="summary-card">
      <h3 className="chart-title">End-of-Run Summary</h3>
      <div className="summary-grid">
        {metrics.map((m) => (
          <div key={m.label} className="summary-row">
            <span className="summary-label">{m.label}</span>
            <span className="summary-value">{m.value}</span>
            {m.cmpValue != null && (
              <span className="summary-cmp">vs {m.cmpValue}</span>
            )}
            {m.delta && (
              <span
                className={`summary-delta ${m.delta.better ? 'better' : 'worse'}`}
              >
                {m.delta.better ? '\u25BC' : '\u25B2'}{' '}
                {typeof m.delta.pct === 'string' ? m.delta.pct : `${Math.abs(m.delta.pct)}%`}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
