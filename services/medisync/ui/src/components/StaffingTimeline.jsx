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
  ReferenceLine,
} from 'recharts';
import { DEPARTMENTS, DEPT_COLORS, DEPT_SHORT } from '../utils/constants';

export default function StaffingTimeline({ data }) {
  // Extract staffing changes at decision points
  const { chartData, decisionHours } = useMemo(() => {
    if (!data || data.length === 0) return { chartData: [], decisionHours: [] };

    const hours = [];
    const step = data.length > 600 ? Math.ceil(data.length / 600) : 1;
    const filtered = data.filter(
      (_, i) => i % step === 0 || i === data.length - 1,
    );

    const rows = filtered.map((point) => {
      if (point.decisionPoint) hours.push(point.simHour);
      const row = { simHour: +point.simHour.toFixed(2) };
      for (const dept of DEPARTMENTS) {
        const s = point.staff[dept];
        if (s) {
          row[dept] = (s.doctors || 0) + (s.nurses || 0) + (s.hcws || 0) + (s.admins || 0);
        }
      }
      return row;
    });

    return { chartData: rows, decisionHours: hours };
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="chart-card chart-empty">
        Staffing timeline will appear here
      </div>
    );
  }

  return (
    <div className="chart-card">
      <h3 className="chart-title">
        Total Staff per Department
        <span className="chart-subtitle">
          Vertical lines = MARL decision points (hourly)
        </span>
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="simHour"
            label={{
              value: 'Simulation Hour',
              position: 'insideBottom',
              offset: -2,
              fontSize: 11,
            }}
            tick={{ fontSize: 10 }}
          />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Legend
            formatter={(val) => DEPT_SHORT[val] || val}
            wrapperStyle={{ fontSize: 10 }}
          />
          {decisionHours.map((h, i) => (
            <ReferenceLine
              key={i}
              x={+h.toFixed(2)}
              stroke="#6366f1"
              strokeDasharray="2 4"
              opacity={0.3}
            />
          ))}
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
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
