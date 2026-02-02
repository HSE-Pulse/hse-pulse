import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts'
import {
  FileText, Users, Building2, TrendingUp,
  Clock, Stethoscope, ArrowRight, Heart,
} from 'lucide-react'
import StatCard from '../components/StatCard'
import NoteTypeTag from '../components/NoteTypeTag'
import { API_BASE } from '../config'
import type { ClinicalNote } from '../data/useNotesData'
import type { NotesStats } from '../data/useNotesData'

interface DashboardProps {
  notes: ClinicalNote[]
  stats: NotesStats
  loading: boolean
  error: string | null
}

export default function Dashboard({ notes, stats, loading, error }: DashboardProps) {
  const navigate = useNavigate()

  const topPatients = useMemo(() => {
    return Object.entries(stats.patientNoteCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([id, count]) => ({ id: Number(id), count }))
  }, [stats.patientNoteCounts])

  const recentNotes = useMemo(() => {
    return [...notes]
      .sort((a, b) => (b.charttime || '').localeCompare(a.charttime || ''))
      .slice(0, 6)
  }, [notes])

  const patientDistribution = useMemo(() => {
    const buckets: Record<string, number> = { '1-2': 0, '3-5': 0, '6-10': 0, '11-20': 0, '20+': 0 }
    Object.values(stats.patientNoteCounts).forEach((count) => {
      if (count <= 2) buckets['1-2']++
      else if (count <= 5) buckets['3-5']++
      else if (count <= 10) buckets['6-10']++
      else if (count <= 20) buckets['11-20']++
      else buckets['20+']++
    })
    return Object.entries(buckets).map(([range, count]) => ({ range, count }))
  }, [stats.patientNoteCounts])

  // Patient demographics
  const [patients, setPatients] = useState<any[]>([])

  useEffect(() => {
    fetch(`${API_BASE}/patients`)
      .then(res => res.json())
      .then(data => setPatients(data.patients || []))
      .catch(() => {})
  }, [])

  const genderData = useMemo(() => {
    const counts: Record<string, number> = {}
    patients.forEach(p => {
      const g = p.gender || 'Unknown'
      counts[g] = (counts[g] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [patients])

  const ageData = useMemo(() => {
    const buckets = { '<30': 0, '30-49': 0, '50-69': 0, '70+': 0 }
    patients.forEach(p => {
      const age = p.age ?? 0
      if (age < 30) buckets['<30']++
      else if (age < 50) buckets['30-49']++
      else if (age < 70) buckets['50-69']++
      else buckets['70+']++
    })
    return Object.entries(buckets).map(([range, count]) => ({ range, count }))
  }, [patients])

  const insuranceData = useMemo(() => {
    const counts: Record<string, number> = {}
    patients.forEach(p => {
      const ins = p.insurance || 'Unknown'
      counts[ins] = (counts[ins] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [patients])

  const DEMO_COLORS = ['#3b82f6', '#f472b6', '#34d399', '#fbbf24', '#a78bfa']

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Failed to load data</h3>
          <p className="text-sm text-slate-500 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Notes"
          value={stats.totalNotes}
          subtitle="Clinical documents"
          icon={<FileText className="w-6 h-6" />}
          color="blue"
          loading={loading}
        />
        <StatCard
          title="Patients"
          value={stats.totalPatients}
          subtitle={`${stats.avgNotesPerPatient} avg notes/patient`}
          icon={<Users className="w-6 h-6" />}
          color="green"
          loading={loading}
        />
        <StatCard
          title="Admissions"
          value={stats.totalAdmissions}
          subtitle="Hospital encounters"
          icon={<Building2 className="w-6 h-6" />}
          color="purple"
          loading={loading}
        />
        <StatCard
          title="Note Types"
          value={Object.keys(stats.noteTypes).length}
          subtitle="Clinical categories"
          icon={<Stethoscope className="w-6 h-6" />}
          color="amber"
          loading={loading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Note Type Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:col-span-1">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Note Type Distribution</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-slate-100 animate-pulse-gentle" />
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.noteTypesArray}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {stats.noteTypesArray.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '13px',
                    }}
                    formatter={(value) => [Number(value).toLocaleString(), 'Notes']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* Legend */}
          {!loading && (
            <div className="mt-4 space-y-2">
              {stats.noteTypesArray.slice(0, 5).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600">{item.name}</span>
                  </div>
                  <span className="font-medium text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes Timeline */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Notes Timeline</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              Chart time distribution
            </div>
          </div>
          {loading ? (
            <div className="h-72 bg-slate-50 rounded-xl animate-pulse-gentle" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.timelineData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
                  <defs>
                    <linearGradient id="colorNotes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '13px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorNotes)"
                    name="Notes"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Patient Demographics */}
      {patients.length > 0 && (
        <>
          <div className="flex items-center gap-2 mt-2">
            <Heart className="w-5 h-5 text-rose-500" />
            <h2 className="text-lg font-semibold text-slate-900">Patient Demographics</h2>
            <span className="text-sm text-slate-500">({patients.length} patients)</span>
          </div>

          {/* Demographics charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gender Distribution */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Gender Distribution</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={genderData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                      {genderData.map((_, i) => (
                        <Cell key={i} fill={DEMO_COLORS[i % DEMO_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '13px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1">
                {genderData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DEMO_COLORS[i % DEMO_COLORS.length] }} />
                      <span className="text-slate-600">{item.name}</span>
                    </div>
                    <span className="font-medium text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Age Distribution */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Age Distribution</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="range" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '13px' }} formatter={(value) => [Number(value), 'Patients']} />
                    <Bar dataKey="count" fill="#f472b6" radius={[6, 6, 0, 0]} name="Patients" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Insurance Type */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Insurance Type</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={insuranceData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                      {insuranceData.map((_, i) => (
                        <Cell key={i} fill={DEMO_COLORS[(i + 2) % DEMO_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '13px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1">
                {insuranceData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DEMO_COLORS[(i + 2) % DEMO_COLORS.length] }} />
                      <span className="text-slate-600">{item.name}</span>
                    </div>
                    <span className="font-medium text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Patient Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">All Patients</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Subject ID</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">MRN</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Gender</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Age</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Blood Type</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Insurance</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-500">Admissions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => {
                    const ids: number[] = p.hadm_ids || []
                    const admLabel = ids.length === 0
                      ? '—'
                      : ids.length <= 3
                        ? ids.join(', ')
                        : `${ids.slice(0, 2).join(', ')} +${ids.length - 2} more`
                    return (
                    <tr
                      key={p.subject_id}
                      onClick={() => navigate(`/patients/${p.subject_id}`)}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-primary-600">{p.subject_id}</td>
                      <td className="py-3 px-4 text-slate-700">{p.mrn || '—'}</td>
                      <td className="py-3 px-4 text-slate-700">{p.gender || '—'}</td>
                      <td className="py-3 px-4 text-slate-700">{p.age ?? '—'}</td>
                      <td className="py-3 px-4 text-slate-700">{p.blood_type || '—'}</td>
                      <td className="py-3 px-4 text-slate-700">{p.insurance || '—'}</td>
                      <td className="py-3 px-4 text-slate-500 text-xs">{admLabel}</td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Notes Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Notes per Patient Distribution</h3>
          {loading ? (
            <div className="h-56 bg-slate-50 rounded-xl animate-pulse-gentle" />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={patientDistribution} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="range"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '13px',
                    }}
                    formatter={(value) => [Number(value), 'Patients']}
                  />
                  <Bar
                    dataKey="count"
                    fill="#8b5cf6"
                    radius={[6, 6, 0, 0]}
                    name="Patients"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Patients + Recent Notes */}
        <div className="space-y-6">
          {/* Top Patients */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Top Patients by Note Count</h3>
              <TrendingUp className="w-4 h-4 text-slate-400" />
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse-gentle" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {topPatients.map((p) => {
                  const pct = Math.round((p.count / stats.totalNotes) * 100)
                  return (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/patients/${p.id}`)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors group text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-xs font-bold text-primary-600">
                        {p.id.toString().slice(-3)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">Patient {p.id}</span>
                          <span className="text-slate-500">{p.count} notes</span>
                        </div>
                        <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-400 rounded-full transition-all"
                            style={{ width: `${Math.min(pct * 3, 100)}%` }}
                          />
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent Notes */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Recent Notes</h3>
              <button
                onClick={() => navigate('/notes')}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse-gentle" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {recentNotes.map((note) => (
                  <button
                    key={note._id}
                    onClick={() => navigate(`/notes/${encodeURIComponent(note.note_id)}`)}
                    className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                  >
                    <div className="mt-0.5">
                      <NoteTypeTag type={note.note_type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        Patient {note.subject_id}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {note.charttime ? new Date(note.charttime).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 mt-1" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
