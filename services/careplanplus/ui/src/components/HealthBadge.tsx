import type { HealthResponse } from '../types'

interface HealthBadgeProps {
  health: HealthResponse | null
  compact?: boolean
}

export default function HealthBadge({ health, compact }: HealthBadgeProps) {
  if (!health) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
        <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
        {!compact && <span className="text-xs font-medium text-slate-500">Connecting...</span>}
      </div>
    )
  }

  const isHealthy = health.status === 'healthy'
  const isPartial = health.demo_mode || !health.database_connected

  if (isHealthy && !isPartial) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-clinical-50 border border-clinical-200">
        <div className="w-2 h-2 rounded-full bg-clinical-500" />
        {!compact && <span className="text-xs font-medium text-clinical-700">Healthy</span>}
      </div>
    )
  }

  if (isHealthy && isPartial) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
        <div className="w-2 h-2 rounded-full bg-amber-500" />
        {!compact && <span className="text-xs font-medium text-amber-700">Demo Mode</span>}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200">
      <div className="w-2 h-2 rounded-full bg-rose-500" />
      {!compact && <span className="text-xs font-medium text-rose-700">Unhealthy</span>}
    </div>
  )
}
