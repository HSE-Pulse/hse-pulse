import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export default function ComparisonView({ currentData, currentSummary, comparisonRun }) {
  if (!comparisonRun || !currentData || currentData.length === 0) return null;

  const cmpData = comparisonRun.data;
  const cmpSummary = comparisonRun.summary;
  const cmpLabel = comparisonRun.label;
  const curLabel = currentData[currentData.length - 1]?.policy?.toUpperCase() || 'MARL';

  // Merged time-series (aligned by step index)
  const merged = useMemo(() => {
    const maxLen = Math.max(currentData.length, cmpData.length);
    const step = maxLen > 600 ? Math.ceil(maxLen / 600) : 1;
    const rows = [];
    for (let i = 0; i < maxLen; i += step) {
      const cur = currentData[i];
      const cmp = cmpData[i];
      rows.push({
        simHour: +(cur?.simHour ?? cmp?.simHour ?? 0).toFixed(2),
        curWait: cur ? +cur.meanWait.toFixed(1) : null,
        cmpWait: cmp ? +cmp.meanWait.toFixed(1) : null,
        curLos: cur ? +cur.meanLos.toFixed(1) : null,
        cmpLos: cmp ? +cmp.meanLos.toFixed(1) : null,
        curReward: cur ? +cur.totalReward.toFixed(2) : null,
        cmpReward: cmp ? +cmp.totalReward.toFixed(2) : null,
      });
    }
    return rows;
  }, [currentData, cmpData]);

  // Summary comparison bars
  const summaryBars = useMemo(() => {
    if (!currentSummary || !cmpSummary) return [];
    return [
      {
        metric: 'Throughput',
        current: currentSummary.finalThroughput,
        comparison: cmpSummary.finalThroughput,
      },
      {
        metric: 'Avg Wait (min)',
        current: +currentSummary.finalMeanWait.toFixed(1),
        comparison: +cmpSummary.finalMeanWait.toFixed(1),
      },
      {
        metric: 'Avg LOS (min)',
        current: +currentSummary.finalMeanLos.toFixed(1),
        comparison: +cmpSummary.finalMeanLos.toFixed(1),
      },
      {
        metric: 'Avg Reward',
        current: +currentSummary.avgReward.toFixed(2),
        comparison: +cmpSummary.avgReward.toFixed(2),
      },
    ];
  }, [currentSummary, cmpSummary]);

  const curColor = '#6366f1';
  const cmpColor = '#94a3b8';

  return (
    <div className="comparison-view">
      <h2 className="section-heading">
        Comparison: {curLabel} vs {cmpLabel}
      </h2>

      <div className="chart-grid">
        {/* Wait Time Comparison */}
        <div className="chart-card">
          <h3 className="chart-title">Mean Wait Time</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={merged} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="simHour" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="m" />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                dataKey="curWait"
                stroke={curColor}
                strokeWidth={2}
                dot={false}
                name={curLabel}
                isAnimationActive={false}
              />
              <Line
                dataKey="cmpWait"
                stroke={cmpColor}
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={false}
                name={cmpLabel}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* LOS Comparison */}
        <div className="chart-card">
          <h3 className="chart-title">Mean Length of Stay</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={merged} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="simHour" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="m" />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                dataKey="curLos"
                stroke={curColor}
                strokeWidth={2}
                dot={false}
                name={curLabel}
                isAnimationActive={false}
              />
              <Line
                dataKey="cmpLos"
                stroke={cmpColor}
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={false}
                name={cmpLabel}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Reward Comparison */}
        <div className="chart-card">
          <h3 className="chart-title">Total Reward</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={merged} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="simHour" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                dataKey="curReward"
                stroke={curColor}
                strokeWidth={2}
                dot={false}
                name={curLabel}
                isAnimationActive={false}
              />
              <Line
                dataKey="cmpReward"
                stroke={cmpColor}
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={false}
                name={cmpLabel}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Bar Comparison */}
        {summaryBars.length > 0 && (
          <div className="chart-card">
            <h3 className="chart-title">Final Metrics</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={summaryBars}
                margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="current"
                  fill={curColor}
                  name={curLabel}
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="comparison"
                  fill={cmpColor}
                  name={cmpLabel}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
