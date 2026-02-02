import { Link } from 'react-router-dom'
import {
  Activity,
  Database,
  Calendar,
  Shield,
  TrendingUp,
  BarChart3,
  GraduationCap,
  ArrowRight,
} from 'lucide-react'
import { useHealth } from '../hooks/useHealth'
import { useApi } from '../hooks/useApi'
import { api } from '../api/client'
import type { Hospital } from '../types'

export default function Dashboard() {
  const { health } = useHealth()
  const { data: hospitalData } = useApi(() => api.hospitals(), [])

  const hospitals = hospitalData?.hospitals ?? []

  const statCards = [
    {
      label: 'Model Status',
      value: health?.model_loaded ? 'Loaded' : 'Demo',
      icon: Activity,
      color: health?.model_loaded ? 'text-clinical-600 bg-clinical-50' : 'text-primary-600 bg-primary-50',
    },
    {
      label: 'DB Connected',
      value: health?.database_connected ? 'Connected' : 'Offline',
      icon: Database,
      color: health?.database_connected ? 'text-clinical-600 bg-clinical-50' : 'text-slate-600 bg-slate-50',
    },
    {
      label: 'Forecast Window',
      value: '7 Days',
      icon: Calendar,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Confidence Interval',
      value: '95%',
      icon: Shield,
      color: 'text-purple-600 bg-purple-50',
    },
  ]

  const quickActions = [
    { to: '/predict', icon: TrendingUp, label: 'New Forecast', description: 'Generate ED trolley predictions' },
    { to: '/data', icon: BarChart3, label: 'Explore Data', description: 'View historical trolley data' },
    { to: '/train', icon: GraduationCap, label: 'Train Model', description: 'Start a new training run' },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500">{card.label}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.color}`}>
                <card.icon className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="text-xl font-bold text-slate-900">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Hospital Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Hospitals ({hospitals.length})</h3>
        {hospitals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {hospitals.map((h: Hospital) => (
              <Link
                key={h.hospital_code}
                to={`/predict?hospital=${encodeURIComponent(h.name)}`}
                className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-xs font-bold text-primary-700 flex-shrink-0">
                  {h.hospital_code}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate group-hover:text-primary-700">{h.name}</div>
                  <div className="text-xs text-slate-500">{h.region}</div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400 py-8 text-center">Loading hospitals...</div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-primary-200 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 group-hover:bg-primary-100 transition-colors">
                  <action.icon className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors" />
              </div>
              <div className="text-sm font-semibold text-slate-900">{action.label}</div>
              <div className="text-xs text-slate-500 mt-1">{action.description}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
