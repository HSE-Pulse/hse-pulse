import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  FileText, Calendar, User, Hash, Eye,
} from 'lucide-react'
import NoteTypeTag from '../components/NoteTypeTag'
import type { ClinicalNote } from '../data/useNotesData'

interface NotesBrowserProps {
  notes: ClinicalNote[]
  loading: boolean
}

const PAGE_SIZE = 20

export default function NotesBrowser({ notes, loading }: NotesBrowserProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [noteTypeFilter, setNoteTypeFilter] = useState<string>('all')
  const [patientFilter, setPatientFilter] = useState('')
  const [sortField, setSortField] = useState<'charttime' | 'subject_id' | 'note_type'>('charttime')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [expandedNote, setExpandedNote] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const noteTypes = useMemo(() => {
    const types = new Set(notes.map((n) => n.note_type))
    return Array.from(types).sort()
  }, [notes])

  const filtered = useMemo(() => {
    let result = [...notes]

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (n) =>
          n.text.toLowerCase().includes(q) ||
          n.note_id.toLowerCase().includes(q) ||
          String(n.subject_id).includes(q)
      )
    }

    // Note type filter
    if (noteTypeFilter !== 'all') {
      result = result.filter((n) => n.note_type === noteTypeFilter)
    }

    // Patient filter
    if (patientFilter.trim()) {
      result = result.filter((n) => String(n.subject_id).includes(patientFilter.trim()))
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      if (sortField === 'charttime') {
        cmp = (a.charttime || '').localeCompare(b.charttime || '')
      } else if (sortField === 'subject_id') {
        cmp = a.subject_id - b.subject_id
      } else {
        cmp = a.note_type.localeCompare(b.note_type)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [notes, search, noteTypeFilter, patientFilter, sortField, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
    setPage(1)
  }

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-primary-500" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-primary-500" />
    )
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        <div className="h-12 bg-white rounded-xl animate-pulse-gentle" />
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse-gentle mb-2" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search notes by content, note ID, or patient ID..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              showFilters
                ? 'bg-primary-50 border-primary-200 text-primary-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {(noteTypeFilter !== 'all' || patientFilter) && (
              <span className="w-2 h-2 rounded-full bg-primary-500" />
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-3 animate-fade-in">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Note Type</label>
              <select
                value={noteTypeFilter}
                onChange={(e) => { setNoteTypeFilter(e.target.value); setPage(1) }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
              >
                <option value="all">All Types</option>
                {noteTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Patient ID</label>
              <input
                type="text"
                value={patientFilter}
                onChange={(e) => { setPatientFilter(e.target.value); setPage(1) }}
                placeholder="e.g. 10046543"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
              />
            </div>
            {(noteTypeFilter !== 'all' || patientFilter) && (
              <button
                onClick={() => { setNoteTypeFilter('all'); setPatientFilter(''); setPage(1) }}
                className="self-end px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Results count */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>
            {filtered.length.toLocaleString()} note{filtered.length !== 1 ? 's' : ''} found
          </span>
          <span>
            Page {page} of {totalPages || 1}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="col-span-2 flex items-center gap-1 cursor-pointer" onClick={() => toggleSort('subject_id')}>
            <User className="w-3 h-3" /> Patient <SortIcon field="subject_id" />
          </div>
          <div className="col-span-2 flex items-center gap-1 cursor-pointer" onClick={() => toggleSort('note_type')}>
            <Hash className="w-3 h-3" /> Type <SortIcon field="note_type" />
          </div>
          <div className="col-span-2 flex items-center gap-1 cursor-pointer" onClick={() => toggleSort('charttime')}>
            <Calendar className="w-3 h-3" /> Date <SortIcon field="charttime" />
          </div>
          <div className="col-span-5 flex items-center gap-1">
            <FileText className="w-3 h-3" /> Content Preview
          </div>
          <div className="col-span-1 text-right">Action</div>
        </div>

        {/* Rows */}
        {paged.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No notes match your search criteria.</p>
          </div>
        ) : (
          paged.map((note) => (
            <div key={note._id} className="border-b border-slate-100 last:border-0">
              <div className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-slate-50/50 transition-colors items-center">
                <div className="col-span-2">
                  <button
                    onClick={() => navigate(`/patients/${note.subject_id}`)}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    {note.subject_id}
                  </button>
                  <p className="text-xs text-slate-400 mt-0.5">ADM: {note.hadm_id}</p>
                </div>
                <div className="col-span-2">
                  <NoteTypeTag type={note.note_type} />
                  <p className="text-xs text-slate-400 mt-1">Seq: {note.note_seq}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-700">
                    {note.charttime ? new Date(note.charttime).toLocaleDateString() : 'N/A'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {note.charttime ? new Date(note.charttime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
                <div className="col-span-5">
                  <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    {note.text.replace(/\s+/g, ' ').substring(0, 200)}...
                  </p>
                </div>
                <div className="col-span-1 flex justify-end gap-1">
                  <button
                    onClick={() => setExpandedNote(expandedNote === note._id ? null : note._id)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Quick preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/notes/${encodeURIComponent(note.note_id)}`)}
                    className="p-2 rounded-lg hover:bg-primary-50 text-slate-400 hover:text-primary-600 transition-colors"
                    title="Open full note"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded preview */}
              {expandedNote === note._id && (
                <div className="px-4 pb-4 animate-fade-in">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <FileText className="w-3.5 h-3.5" />
                        <span className="font-medium">Note ID: {note.note_id}</span>
                      </div>
                      <button
                        onClick={() => navigate(`/notes/${encodeURIComponent(note.note_id)}`)}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Open full note &rarr;
                      </button>
                    </div>
                    <div className="note-text max-h-64 overflow-y-auto">
                      {note.text.substring(0, 1500)}
                      {note.text.length > 1500 && '\n\n... [truncated]'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (page <= 3) {
                pageNum = i + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = page - 2 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    page === pageNum
                      ? 'bg-primary-500 text-white'
                      : 'border border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
