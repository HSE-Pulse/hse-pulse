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
} from 'recharts';
import { DEPARTMENTS, DEPT_COLORS, DEPT_SHORT } from '../utils/constants';

export default function WaitTimeChart({ data, comparisonData }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const step = data.length > 600 ? Math.ceil(data.length / 600) : 1;
    return data
      .filter((_, i) => i % step === 0 || i === data.length - 1)
      .map((point, idx) => {
        const row = {
          simHour: +point.simHour.toFixed(2),
          meanWait: +point.meanWait.toFixed(1),
        };
        for (const dept of DEPARTMENTS) {
          row[dept] = +(point.waits[dept] || 0).toFixed(1);
        }
        if (comparisonData) {
          const cmpIdx = idx * step;
          const cmp = comparisonData[cmpIdx];
          if (cmp) row.meanWait_cmp = +cmp.meanWait.toFixed(1);
        }
        return row;
      });
  }, [data, comparisonData]);

  // Show only departments with non-zero wait times
  const activeDepts = useMemo(() => {
    return DEPARTMENTS.filter((dept) =>
      chartData.some((row) => row[dept] > 0),
    );
  }, [chartData]);

  if (chartData.length === 0) {
    return <div className="chart-card chart-empty">Wait times will appear here</div>;
  }

  return (
    <div className="chart-card">
      <h3 className="chart-title">Waiting Time (minutes)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="simHour"
            label={{ value: 'Simulation Hour', position: 'insideBottom', offset: -2, fontSize: 11 }}
            tick={{ fontSize: 10 }}
          />
          <YAxis tick={{ fontSize: 10 }} unit="m" />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Legend
            formatter={(val) => {
              if (val === 'meanWait') return 'Overall Mean';
              if (val === 'meanWait_cmp') return 'Overall Mean (cmp)';
              return DEPT_SHORT[val] || val;
            }}
            wrapperStyle={{ fontSize: 10 }}
          />
          <Line
            dataKey="meanWait"
            stroke="#1e293b"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          {comparisonData && (
            <Line
              dataKey="meanWait_cmp"
              stroke="#1e293b"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.4}
              dot={false}
              isAnimationActive={false}
            />
          )}
          {activeDepts.map((dept) => (
            <Line
              key={dept}
              dataKey={dept}
              stroke={DEPT_COLORS[dept]}
              dot={false}
              strokeWidth={1}
              opacity={0.6}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
