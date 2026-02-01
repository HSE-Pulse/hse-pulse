import type { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  color: 'blue' | 'green' | 'purple' | 'amber' | 'rose'
  loading?: boolean
}

const colorMap = {
  blue: {
    bg: 'bg-primary-50',
    icon: 'bg-primary-100 text-primary-600',
    text: 'text-primary-600',
  },
  green: {
    bg: 'bg-clinical-50',
    icon: 'bg-clinical-100 text-clinical-600',
    text: 'text-clinical-600',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'bg-purple-100 text-purple-600',
    text: 'text-purple-600',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'bg-amber-100 text-amber-600',
    text: 'text-amber-600',
  },
  rose: {
    bg: 'bg-rose-50',
    icon: 'bg-rose-100 text-rose-600',
    text: 'text-rose-600',
  },
}

export default function StatCard({ title, value, subtitle, icon, color, loading }: StatCardProps) {
  const colors = colorMap[color]

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="h-3 bg-slate-200 rounded animate-pulse-gentle w-20" />
            <div className="h-8 bg-slate-200 rounded animate-pulse-gentle w-16" />
            <div className="h-3 bg-slate-200 rounded animate-pulse-gentle w-24" />
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 animate-pulse-gentle" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className={`text-sm mt-1 ${colors.text} font-medium`}>{subtitle}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl ${colors.icon} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
