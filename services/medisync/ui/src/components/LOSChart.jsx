import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function LOSChart({ data, comparisonData }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const step = data.length > 600 ? Math.ceil(data.length / 600) : 1;
    return data
      .filter((_, i) => i % step === 0 || i === data.length - 1)
      .map((point, idx) => {
        const row = {
          simHour: +point.simHour.toFixed(2),
          los: +point.meanLos.toFixed(1),
        };
        if (comparisonData) {
          const cmpIdx = idx * step;
          const cmp = comparisonData[cmpIdx];
          if (cmp) row.los_cmp = +cmp.meanLos.toFixed(1);
        }
        return row;
      });
  }, [data, comparisonData]);

  if (chartData.length === 0) {
    return <div className="chart-card chart-empty">LOS trend will appear here</div>;
  }

  return (
    <div className="chart-card">
      <h3 className="chart-title">Mean Length of Stay (minutes)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="simHour"
            label={{ value: 'Simulation Hour', position: 'insideBottom', offset: -2, fontSize: 11 }}
            tick={{ fontSize: 10 }}
          />
          <YAxis tick={{ fontSize: 10 }} unit="m" />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Area
            dataKey="los"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.15}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            name="Mean LOS"
          />
          {comparisonData && (
            <Area
              dataKey="los_cmp"
              stroke="#94a3b8"
              fill="#94a3b8"
              fillOpacity={0.08}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={false}
              name="Mean LOS (comparison)"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
