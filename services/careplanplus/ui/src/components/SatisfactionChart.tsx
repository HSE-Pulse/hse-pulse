import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { NiesSummaryCategory } from '../types'

interface SatisfactionChartProps {
  data: NiesSummaryCategory[]
  height?: number
}

const COLORS = [
  '#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
  '#84cc16', '#e11d48',
]

export default function SatisfactionChart({ data, height = 400 }: SatisfactionChartProps) {
  const chartData = data.map((d) => ({
    name: d.condition_label.length > 20
      ? d.condition_label.substring(0, 20) + '...'
      : d.condition_label,
    fullName: d.condition_label,
    satisfaction: Math.round(d.avg_satisfaction * 100),
    count: d.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 80 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#64748b' }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#64748b' }}
          domain={[0, 100]}
          label={{ value: 'Avg Satisfaction (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#64748b' } }}
        />
        <Tooltip
          formatter={(value: number, _name: string, props: { payload: { fullName: string; count: number } }) => [
            `${value}% (${props.payload.count} records)`,
            props.payload.fullName,
          ]}
          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
        />
        <Bar dataKey="satisfaction" radius={[6, 6, 0, 0]}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
