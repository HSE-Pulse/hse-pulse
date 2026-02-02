import { useState, useEffect, useMemo } from 'react'
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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { useHealth } from '../hooks/useHealth'
import { useApi } from '../hooks/useApi'
import { api } from '../api/client'
import type { Hospital, TrolleyRecord, PredictionResponse } from '../types'

export default function Dashboard() {
  const { health } = useHealth()
  const { data: hospitalData } = useApi(() => api.hospitals(), [])
  const { data: latestDateData } = useApi(() => api.latestDate(), [])

  const hospitals = hospitalData?.hospitals ?? []
  const latestDate = latestDateData?.latest_date

  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)
  const [historicalRecords, setHistoricalRecords] = useState<TrolleyRecord[]>([])
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null)

  // Auto-select first hospital when loaded
  useEffect(() => {
    if (hospitals.length > 0 && !selectedHospital) {
      setSelectedHospital(hospitals[0])
    }
  }, [hospitals, selectedHospital])

  // Fetch last 30 records + predict for selected hospital
  useEffect(() => {
    if (!selectedHospital || !latestDate) return

    const code = selectedHospital.trolley_code || selectedHospital.hospital_code
    api.trolleyData(code, 30)
      .then((res) => setHistoricalRecords(res.records))
      .catch(() => setHistoricalRecords([]))

    api.predict({
      hospital: selectedHospital.name,
      region: selectedHospital.region,
      date: latestDate,
      forecast_days: 7,
    })
      .then(setPrediction)
      .catch(() => setPrediction(null))
  }, [selectedHospital, latestDate])

  // Combined chart data
  const chartData = useMemo(() => {
    const data: { date: string; actual: number | null; predicted: number | null }[] = []
    const sorted = [...historicalRecords].sort((a, b) => a.date.localeCompare(b.date))
    for (const r of sorted) {
      data.push({ date: r.date?.slice(0, 10) ?? '', actual: r.trolley_count ?? null, predicted: null })
    }
    if (prediction) {
      for (const f of prediction.forecast) {
        data.push({ date: f.date, actual: null, predicted: f.predicted_trolleys })
      }
    }
    return data
  }, [historicalRecords, prediction])

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
      label: 'Latest Data',
      value: latestDate ?? 'N/A',
      icon: Calendar,
      color: latestDate ? 'text-blue-600 bg-blue-50' : 'text-slate-600 bg-slate-50',
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

      {/* Overview Chart: Last 30 + Predicted */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-slate-900">
              Trolley Overview: {selectedHospital?.name}
            </h3>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 inline-block rounded" /> Actual</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-500 inline-block rounded" /> Predicted</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Last {historicalRecords.length} records + {prediction?.forecast.length ?? 0} day forecast
          </p>

          {/* Hospital picker */}
          <div className="mb-4">
            <select
              value={selectedHospital?.hospital_code ?? ''}
              onChange={(e) => {
                const h = hospitals.find((h: Hospital) => h.hospital_code === e.target.value)
                if (h) { setSelectedHospital(h); setHistoricalRecords([]); setPrediction(null) }
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
            >
              {hospitals.map((h: Hospital) => (
                <option key={h.hospital_code} value={h.hospital_code}>{h.name}</option>
              ))}
            </select>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="dashActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dashPred" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                {latestDate && <ReferenceLine x={latestDate} stroke="#94a3b8" strokeDasharray="4 4" />}
                <Area type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} fill="url(#dashActual)" name="Actual" connectNulls={false} />
                <Area type="monotone" dataKey="predicted" stroke="#f59e0b" strokeWidth={2} fill="url(#dashPred)" name="Predicted" connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
