import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
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
import { useApi } from '../hooks/useApi'
import { api } from '../api/client'
import type { Hospital, PredictionResponse, TrolleyRecord } from '../types'

export default function Predict() {
  const [searchParams] = useSearchParams()
  const { data: hospitalData } = useApi(() => api.hospitals(), [])
  const { data: latestDateData } = useApi(() => api.latestDate(), [])
  const hospitals = hospitalData?.hospitals ?? []

  const [hospital, setHospital] = useState('')
  const [region, setRegion] = useState('')
  const [date, setDate] = useState('')
  const [forecastDays, setForecastDays] = useState(7)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [surgeCapacity, setSurgeCapacity] = useState('')
  const [delayedTransfers, setDelayedTransfers] = useState('')
  const [waiting24hrs, setWaiting24hrs] = useState('')
  const [waiting75y24hrs, setWaiting75y24hrs] = useState('')

  const [result, setResult] = useState<PredictionResponse | null>(null)
  const [historicalRecords, setHistoricalRecords] = useState<TrolleyRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Set date to last available data date once fetched
  useEffect(() => {
    if (latestDateData?.latest_date && !date) {
      setDate(latestDateData.latest_date)
    }
  }, [latestDateData, date])

  // Auto-fill hospital from URL param
  useEffect(() => {
    const urlHospital = searchParams.get('hospital')
    if (urlHospital && hospitals.length > 0) {
      setHospital(urlHospital)
      const found = hospitals.find((h: Hospital) => h.name === urlHospital)
      if (found) setRegion(found.region)
    }
  }, [searchParams, hospitals])

  // Auto-fill region when hospital changes
  useEffect(() => {
    const found = hospitals.find((h: Hospital) => h.name === hospital)
    if (found) setRegion(found.region)
  }, [hospital, hospitals])

  // Auto-fetch last 30 records when hospital changes
  useEffect(() => {
    if (!hospital || hospitals.length === 0) return
    const found = hospitals.find((h: Hospital) => h.name === hospital)
    if (!found) return
    api.trolleyData(found.trolley_code || found.hospital_code, 30)
      .then((res) => setHistoricalRecords(res.records))
      .catch(() => setHistoricalRecords([]))
  }, [hospital, hospitals])

  const handlePredict = async () => {
    if (!hospital || !region || !date) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.predict({
        hospital,
        region,
        date,
        forecast_days: forecastDays,
        ...(surgeCapacity ? { surge_capacity: parseInt(surgeCapacity) } : {}),
        ...(delayedTransfers ? { delayed_transfers: parseInt(delayedTransfers) } : {}),
        ...(waiting24hrs ? { waiting_24hrs: parseInt(waiting24hrs) } : {}),
        ...(waiting75y24hrs ? { waiting_75y_24hrs: parseInt(waiting75y24hrs) } : {}),
      })
      setResult(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  // Build combined chart: last 30 actual + predicted
  const chartData = useMemo(() => {
    const data: { date: string; actual: number | null; predicted: number | null; lower: number | null; upper: number | null }[] = []

    // Add historical records (reverse to chronological order)
    const sorted = [...historicalRecords].sort((a, b) => a.date.localeCompare(b.date))
    for (const r of sorted) {
      data.push({
        date: r.date?.slice(0, 10) ?? '',
        actual: r.trolley_count ?? null,
        predicted: null,
        lower: null,
        upper: null,
      })
    }

    // Add predictions
    if (result) {
      for (const f of result.forecast) {
        data.push({
          date: f.date,
          actual: null,
          predicted: f.predicted_trolleys,
          lower: f.confidence_lower,
          upper: f.confidence_upper,
        })
      }
    }

    return data
  }, [historicalRecords, result])

  const dividerDate = latestDateData?.latest_date || date

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Input Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Forecast Parameters</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Hospital */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Hospital</label>
            <select
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
            >
              <option value="">Select hospital...</option>
              {hospitals.map((h: Hospital) => (
                <option key={h.hospital_code} value={h.name}>{h.name}</option>
              ))}
            </select>
          </div>

          {/* Region (auto-filled) */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Region</label>
            <input
              type="text"
              value={region}
              readOnly
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-500"
              placeholder="Auto-filled"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Forecast From {latestDateData?.latest_date ? '(last data: ' + latestDateData.latest_date + ')' : ''}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
            />
          </div>

          {/* Forecast Days */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Forecast Days: {forecastDays}
            </label>
            <input
              type="range"
              min={1}
              max={14}
              value={forecastDays}
              onChange={(e) => setForecastDays(parseInt(e.target.value))}
              className="w-full mt-2 accent-primary-500"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>1</span><span>14</span>
            </div>
          </div>
        </div>

        {/* Advanced Inputs */}
        <div className="border-t border-slate-100 pt-3 mt-3">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Advanced Inputs
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-3 animate-fade-in">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Surge Capacity</label>
                <input type="number" value={surgeCapacity} onChange={(e) => setSurgeCapacity(e.target.value)}
                  placeholder="Optional" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Delayed Transfers</label>
                <input type="number" value={delayedTransfers} onChange={(e) => setDelayedTransfers(e.target.value)}
                  placeholder="Optional" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Waiting &gt;24hrs</label>
                <input type="number" value={waiting24hrs} onChange={(e) => setWaiting24hrs(e.target.value)}
                  placeholder="Optional" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">&gt;75yrs Waiting &gt;24hrs</label>
                <input type="number" value={waiting75y24hrs} onChange={(e) => setWaiting75y24hrs(e.target.value)}
                  placeholder="Optional" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400" />
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4 mt-5">
          <button
            onClick={handlePredict}
            disabled={loading || !hospital || !date}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            {loading ? 'Predicting...' : 'Generate Forecast'}
          </button>

          {result && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              {result.inference_time_ms.toFixed(1)}ms inference
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Combined Chart: Actual + Predicted */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-900">
              {result ? `Actual vs Predicted: ${result.hospital}` : `Last 30 Records: ${hospital}`}
            </h3>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 inline-block rounded" /> Actual</span>
              {result && <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-500 inline-block rounded" /> Predicted</span>}
            </div>
          </div>
          {result && (
            <p className="text-xs text-slate-400 mb-4">
              {historicalRecords.length} historical records + {result.forecast.length} day forecast from {result.forecast_start}
            </p>
          )}

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                  formatter={(value, name) => value != null ? [String(value), String(name)] : ['-', String(name)]}
                />
                {dividerDate && <ReferenceLine x={dividerDate} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Forecast →', position: 'top', fontSize: 11, fill: '#94a3b8' }} />}
                <Area type="monotone" dataKey="upper" stroke="none" fill="url(#colorCI)" name="CI Upper" connectNulls={false} />
                <Area type="monotone" dataKey="lower" stroke="none" fill="transparent" name="CI Lower" connectNulls={false} />
                <Area type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} fill="url(#colorActual)" name="Actual Trolleys" connectNulls={false} />
                <Area type="monotone" dataKey="predicted" stroke="#f59e0b" strokeWidth={2} fill="url(#colorPred)" name="Predicted Trolleys" connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Forecast Table */}
      {result && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Forecast Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-6 py-3 font-medium text-slate-500">Date</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-500">Day</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-500">Predicted Trolleys</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-500">CI Lower</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-500">CI Upper</th>
                </tr>
              </thead>
              <tbody>
                {result.forecast.map((f) => (
                  <tr key={f.date} className="border-t border-slate-50 hover:bg-slate-50/50">
                    <td className="px-6 py-3 text-slate-900 font-medium">{f.date}</td>
                    <td className="px-6 py-3 text-slate-600">{f.day}</td>
                    <td className="px-6 py-3 text-right font-semibold text-primary-700">{f.predicted_trolleys}</td>
                    <td className="px-6 py-3 text-right text-slate-500">{f.confidence_lower}</td>
                    <td className="px-6 py-3 text-right text-slate-500">{f.confidence_upper}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
