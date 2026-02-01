import { useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, FileText, User, Calendar, Building2,
  Hash, Clock, ClipboardList, ChevronRight,
} from 'lucide-react'
import NoteTypeTag from '../components/NoteTypeTag'
import type { ClinicalNote } from '../data/useNotesData'

interface NoteDetailProps {
  notes: ClinicalNote[]
}

export default function NoteDetail({ notes }: NoteDetailProps) {
  const { noteId } = useParams<{ noteId: string }>()
  const navigate = useNavigate()

  const note = useMemo(
    () => notes.find((n) => n.note_id === decodeURIComponent(noteId || '')),
    [notes, noteId]
  )

  const siblingNotes = useMemo(() => {
    if (!note) return []
    return notes
      .filter((n) => n.hadm_id === note.hadm_id && n._id !== note._id)
      .sort((a, b) => (a.charttime || '').localeCompare(b.charttime || ''))
  }, [notes, note])

  if (!note) {
    return (
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900">Note not found</h2>
          <p className="text-sm text-slate-500 mt-1">The requested note could not be located in the dataset.</p>
        </div>
      </div>
    )
  }

  // Extract sections from note text
  const sections = useMemo(() => {
    const text = note.text
    const sectionRegex = /\n\s*([A-Z][A-Za-z\s/]+):\s*\n/g
    const parts: { title: string; content: string }[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = sectionRegex.exec(text)) !== null) {
      if (lastIndex > 0 || match.index > 0) {
        const prevContent = text.substring(lastIndex, match.index).trim()
        if (prevContent) {
          if (parts.length === 0) {
            parts.push({ title: 'Overview', content: prevContent })
          } else {
            parts[parts.length - 1].content = prevContent
          }
        }
      }
      parts.push({ title: match[1].trim(), content: '' })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      const remaining = text.substring(lastIndex).trim()
      if (parts.length > 0) {
        parts[parts.length - 1].content = remaining
      } else {
        parts.push({ title: 'Full Note', content: remaining })
      }
    }

    if (parts.length === 0) {
      parts.push({ title: 'Full Note', content: text })
    }

    return parts
  }, [note.text])

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Header card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <NoteTypeTag type={note.note_type} size="md" />
                  <span className="text-xs text-slate-400 font-mono">{note.note_id}</span>
                </div>
                <h1 className="text-xl font-bold text-slate-900">
                  Clinical Note - Patient {note.subject_id}
                </h1>
              </div>
              <Link
                to={`/patients/${note.subject_id}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100 transition-colors"
              >
                <User className="w-4 h-4" />
                View Patient
              </Link>
            </div>

            {/* Metadata grid */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Chart Time</p>
                  <p className="text-slate-700 font-medium">
                    {note.charttime ? new Date(note.charttime).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Store Time</p>
                  <p className="text-slate-700 font-medium">
                    {note.storetime ? new Date(note.storetime).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Admission ID</p>
                  <p className="text-slate-700 font-medium">{note.hadm_id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Hash className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-400">Sequence</p>
                  <p className="text-slate-700 font-medium">{note.note_seq}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Note content sections */}
          {sections.map((section, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary-500" />
                {section.title}
              </h3>
              <div className="note-text">{section.content}</div>
            </div>
          ))}
        </div>

        {/* Sidebar - Related notes */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Same Admission ({siblingNotes.length + 1} notes)
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {/* Current note */}
                <div className="p-3 rounded-xl bg-primary-50 border border-primary-200">
                  <div className="flex items-center gap-2 mb-1">
                    <NoteTypeTag type={note.note_type} />
                  </div>
                  <p className="text-xs text-primary-600 font-medium">Current note</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {note.charttime ? new Date(note.charttime).toLocaleDateString() : 'N/A'}
                  </p>
                </div>

                {siblingNotes.map((sib) => (
                  <button
                    key={sib._id}
                    onClick={() => navigate(`/notes/${encodeURIComponent(sib.note_id)}`)}
                    className="w-full p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <NoteTypeTag type={sib.note_type} />
                      <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-slate-500" />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {sib.charttime ? new Date(sib.charttime).toLocaleDateString() : 'N/A'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {sib.text.replace(/\s+/g, ' ').substring(0, 80)}...
                    </p>
                  </button>
                ))}

                {siblingNotes.length === 0 && (
                  <p className="text-xs text-slate-400 p-2">No other notes in this admission.</p>
                )}
              </div>
            </div>

            {/* Note stats */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Note Statistics</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Characters</span>
                  <span className="font-medium text-slate-700">{note.text.length.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Words</span>
                  <span className="font-medium text-slate-700">
                    {note.text.split(/\s+/).filter(Boolean).length.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sections</span>
                  <span className="font-medium text-slate-700">{sections.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
