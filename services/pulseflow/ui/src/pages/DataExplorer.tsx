import { useState, useMemo } from 'react'
import {
  Loader2,
  BarChart3,
  Search,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useApi } from '../hooks/useApi'
import { api } from '../api/client'
import type { Hospital, TrolleyRecord } from '../types'

export default function DataExplorer() {
  const { data: hospitalData } = useApi(() => api.hospitals(), [])
  const hospitals = hospitalData?.hospitals ?? []

  const [hospitalCode, setHospitalCode] = useState('')
  const [days, setDays] = useState(30)
  const [records, setRecords] = useState<TrolleyRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetched, setFetched] = useState(false)

  const handleFetch = async () => {
    if (!hospitalCode) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.trolleyData(hospitalCode, days)
      setRecords(res.records)
      setFetched(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const chartData = useMemo(() =>
    [...records].reverse().map((r) => ({
      date: r.date?.slice(5, 10) ?? '',
      trolley_count: r.trolley_count ?? 0,
    })), [records])

  const stats = useMemo(() => {
    if (records.length === 0) return null
    const counts = records.map((r) => r.trolley_count).filter((v) => v != null)
    if (counts.length === 0) return null
    return {
      min: Math.min(...counts),
      max: Math.max(...counts),
      avg: (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1),
      records: records.length,
    }
  }, [records])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Query Historical Data</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Hospital</label>
            <select
              value={hospitalCode}
              onChange={(e) => setHospitalCode(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 min-w-[220px]"
            >
              <option value="">Select hospital...</option>
              {hospitals.map((h: Hospital) => (
                <option key={h.hospital_code} value={h.hospital_code}>
                  {h.hospital_code} - {h.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Days</label>
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 30)}
              className="w-24 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
            />
          </div>

          <button
            onClick={handleFetch}
            disabled={loading || !hospitalCode}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Fetch Data
          </button>
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Records', value: stats.records },
            { label: 'Min Trolleys', value: stats.min },
            { label: 'Max Trolleys', value: stats.max },
            { label: 'Avg Trolleys', value: stats.avg },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500 mb-1">{s.label}</div>
              <div className="text-lg font-bold text-slate-900">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-primary-600" />
            <h3 className="text-sm font-semibold text-slate-900">Trolley Count Over Time</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                />
                <Line type="monotone" dataKey="trolley_count" stroke="#f59e0b" strokeWidth={2} dot={false} name="Trolley Count" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Raw Data Table */}
      {fetched && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Raw Data ({records.length} records)</h3>
          </div>
          {records.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-6 py-3 font-medium text-slate-500">Date</th>
                    <th className="text-right px-6 py-3 font-medium text-slate-500">Trolley Count</th>
                    <th className="text-right px-6 py-3 font-medium text-slate-500">Admissions</th>
                    <th className="text-right px-6 py-3 font-medium text-slate-500">Discharges</th>
                    <th className="text-right px-6 py-3 font-medium text-slate-500">&gt;24hrs</th>
                    <th className="text-right px-6 py-3 font-medium text-slate-500">Elderly</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50">
                      <td className="px-6 py-3 text-slate-900 font-medium">{r.date}</td>
                      <td className="px-6 py-3 text-right font-semibold text-primary-700">{r.trolley_count ?? '-'}</td>
                      <td className="px-6 py-3 text-right text-slate-600">{r.admissions ?? '-'}</td>
                      <td className="px-6 py-3 text-right text-slate-600">{r.discharges ?? '-'}</td>
                      <td className="px-6 py-3 text-right text-slate-600">{r.trolleys_gt_24hrs ?? '-'}</td>
                      <td className="px-6 py-3 text-right text-slate-600">{r.elderly_waiting ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-sm text-slate-400">
              No data available for this hospital
            </div>
          )}
        </div>
      )}
    </div>
  )
}
