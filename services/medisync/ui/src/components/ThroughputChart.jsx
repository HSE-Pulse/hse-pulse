import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function ThroughputChart({ data, comparisonData }) {
  // Aggregate throughput per simulated day
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const byDay = {};
    for (const point of data) {
      const day = Math.floor(point.simDay) + 1;
      byDay[day] = point.discharged;
    }

    const cmpByDay = {};
    if (comparisonData) {
      for (const point of comparisonData) {
        const day = Math.floor(point.simDay) + 1;
        cmpByDay[day] = point.discharged;
      }
    }

    const days = Object.keys(byDay)
      .map(Number)
      .sort((a, b) => a - b);

    return days.map((day, i) => {
      const prev = i > 0 ? byDay[days[i - 1]] : 0;
      const prevCmp = i > 0 ? (cmpByDay[days[i - 1]] || 0) : 0;
      return {
        day: `Day ${day}`,
        discharged: byDay[day] - prev,
        ...(comparisonData
          ? { discharged_cmp: (cmpByDay[day] || 0) - prevCmp }
          : {}),
      };
    });
  }, [data, comparisonData]);

  if (chartData.length === 0) {
    return <div className="chart-card chart-empty">Throughput will appear here</div>;
  }

  return (
    <div className="chart-card">
      <h3 className="chart-title">Throughput (Discharges per Day)</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar
            dataKey="discharged"
            fill="#22c55e"
            name="Current Run"
            radius={[3, 3, 0, 0]}
          />
          {comparisonData && (
            <Bar
              dataKey="discharged_cmp"
              fill="#94a3b8"
              name="Comparison"
              radius={[3, 3, 0, 0]}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
