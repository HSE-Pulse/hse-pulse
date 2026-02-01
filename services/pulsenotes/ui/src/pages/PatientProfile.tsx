import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, FileText, Calendar, Building2,
  ChevronRight, BarChart3,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import NoteTypeTag from '../components/NoteTypeTag'
import { getNoteTypeColor, getNoteTypeLabel } from '../data/useNotesData'
import type { ClinicalNote } from '../data/useNotesData'

interface PatientProfileProps {
  notes: ClinicalNote[]
}

export default function PatientProfile({ notes }: PatientProfileProps) {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const [activeAdmission, setActiveAdmission] = useState<number | null>(null)

  const pid = Number(patientId)

  const patientNotes = useMemo(
    () => notes
      .filter((n) => n.subject_id === pid)
      .sort((a, b) => (b.charttime || '').localeCompare(a.charttime || '')),
    [notes, pid]
  )

  const admissions = useMemo(() => {
    const admMap = new Map<number, ClinicalNote[]>()
    for (const note of patientNotes) {
      if (!admMap.has(note.hadm_id)) admMap.set(note.hadm_id, [])
      admMap.get(note.hadm_id)!.push(note)
    }
    return Array.from(admMap.entries())
      .map(([id, adNotes]) => ({
        id,
        notes: adNotes.sort((a, b) => (a.charttime || '').localeCompare(b.charttime || '')),
        dateRange: {
          start: adNotes.reduce((min, n) => (!min || (n.charttime && n.charttime < min) ? n.charttime : min), ''),
          end: adNotes.reduce((max, n) => (!max || (n.charttime && n.charttime > max) ? n.charttime : max), ''),
        },
      }))
      .sort((a, b) => (b.dateRange.end || '').localeCompare(a.dateRange.end || ''))
  }, [patientNotes])

  const noteTypeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const note of patientNotes) {
      counts[note.note_type] = (counts[note.note_type] || 0) + 1
    }
    return Object.entries(counts)
      .map(([name, value]) => ({
        name: getNoteTypeLabel(name),
        value,
        color: getNoteTypeColor(name),
      }))
      .sort((a, b) => b.value - a.value)
  }, [patientNotes])

  const displayedNotes = useMemo(() => {
    if (activeAdmission === null) return patientNotes
    return patientNotes.filter((n) => n.hadm_id === activeAdmission)
  }, [patientNotes, activeAdmission])

  if (patientNotes.length === 0) {
    return (
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900">Patient not found</h2>
          <p className="text-sm text-slate-500 mt-1">No notes found for patient ID {patientId}.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Patient Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <User className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Patient {pid}</h1>
              <p className="text-sm text-slate-500">Subject ID: {pid}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="px-4 py-2 rounded-xl bg-primary-50 border border-primary-200 text-center">
              <p className="text-2xl font-bold text-primary-700">{patientNotes.length}</p>
              <p className="text-xs text-primary-600">Notes</p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-purple-50 border border-purple-200 text-center">
              <p className="text-2xl font-bold text-purple-700">{admissions.length}</p>
              <p className="text-xs text-purple-600">Admissions</p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <p className="text-2xl font-bold text-amber-700">{noteTypeBreakdown.length}</p>
              <p className="text-xs text-amber-600">Note Types</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Notes list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Admission filter */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900">Admissions</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveAdmission(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeAdmission === null
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({patientNotes.length})
              </button>
              {admissions.map((adm) => (
                <button
                  key={adm.id}
                  onClick={() => setActiveAdmission(adm.id === activeAdmission ? null : adm.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeAdmission === adm.id
                      ? 'bg-primary-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {adm.id} ({adm.notes.length})
                </button>
              ))}
            </div>
          </div>

          {/* Notes timeline */}
          <div className="space-y-3">
            {displayedNotes.map((note, i) => (
              <button
                key={note._id}
                onClick={() => navigate(`/notes/${encodeURIComponent(note.note_id)}`)}
                className="w-full bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all text-left group animate-slide-in"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <NoteTypeTag type={note.note_type} />
                      <span className="text-xs text-slate-400 font-mono">{note.note_id}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {note.charttime ? new Date(note.charttime).toLocaleString() : 'N/A'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        ADM: {note.hadm_id}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                      {note.text.replace(/\s+/g, ' ').substring(0, 300)}...
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary-500 mt-1 flex-shrink-0 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Note type chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sticky top-24">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900">Note Types</h3>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={noteTypeBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {noteTypeBreakdown.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [Number(value), 'Notes']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {noteTypeBreakdown.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600">{item.name}</span>
                  </div>
                  <span className="font-semibold text-slate-700">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              Admission Timeline
            </h3>
            <div className="space-y-4">
              {admissions.map((adm) => (
                <div key={adm.id} className="relative pl-6">
                  <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-primary-500 border-2 border-white shadow" />
                  {admissions.indexOf(adm) < admissions.length - 1 && (
                    <div className="absolute left-[5px] top-4 w-0.5 h-full bg-slate-200" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-700">Admission {adm.id}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {adm.dateRange.start
                        ? new Date(adm.dateRange.start).toLocaleDateString()
                        : 'N/A'}{' '}
                      &mdash;{' '}
                      {adm.dateRange.end
                        ? new Date(adm.dateRange.end).toLocaleDateString()
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {adm.notes.length} note{adm.notes.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
