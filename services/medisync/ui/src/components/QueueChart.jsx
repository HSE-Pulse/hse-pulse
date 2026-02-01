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

export default function QueueChart({ data, comparisonData }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const step = data.length > 600 ? Math.ceil(data.length / 600) : 1;
    return data
      .filter((_, i) => i % step === 0 || i === data.length - 1)
      .map((point, idx) => {
        const row = { simHour: +point.simHour.toFixed(2) };
        for (const dept of DEPARTMENTS) {
          row[dept] = point.queues[dept] || 0;
          if (comparisonData) {
            const cmpIdx = idx * step;
            const cmp = comparisonData[cmpIdx];
            if (cmp) row[`${dept}_cmp`] = cmp.queues[dept] || 0;
          }
        }
        return row;
      });
  }, [data, comparisonData]);

  if (chartData.length === 0) {
    return <div className="chart-card chart-empty">Queue lengths will appear here</div>;
  }

  return (
    <div className="chart-card">
      <h3 className="chart-title">Queue Length per Department</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="simHour"
            label={{ value: 'Simulation Hour', position: 'insideBottom', offset: -2, fontSize: 11 }}
            tick={{ fontSize: 10 }}
          />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{ fontSize: 11 }}
            formatter={(val, name) => {
              const isCmp = name.endsWith('_cmp');
              const dept = isCmp ? name.replace('_cmp', '') : name;
              const label = `${DEPT_SHORT[dept] || dept}${isCmp ? ' (cmp)' : ''}`;
              return [val, label];
            }}
          />
          <Legend
            formatter={(val) => DEPT_SHORT[val] || val}
            wrapperStyle={{ fontSize: 10 }}
          />
          {DEPARTMENTS.map((dept) => (
            <Line
              key={dept}
              dataKey={dept}
              stroke={DEPT_COLORS[dept]}
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          ))}
          {comparisonData &&
            DEPARTMENTS.map((dept) => (
              <Line
                key={`${dept}_cmp`}
                dataKey={`${dept}_cmp`}
                stroke={DEPT_COLORS[dept]}
                dot={false}
                strokeWidth={1}
                strokeDasharray="4 3"
                opacity={0.4}
                isAnimationActive={false}
                legendType="none"
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
