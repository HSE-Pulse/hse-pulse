import { useState } from 'react'
import { Plus, X, Search } from 'lucide-react'
import { useIcdSearch } from '../hooks/useIcdSearch'
import type { Diagnosis } from '../types'

interface DiagnosisInputProps {
  diagnoses: Diagnosis[]
  onChange: (diagnoses: Diagnosis[]) => void
}

export default function DiagnosisInput({ diagnoses, onChange }: DiagnosisInputProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const { results, loading } = useIcdSearch(searchQuery)

  const addDiagnosis = (code: string, title: string) => {
    const exists = diagnoses.some((d) => d.icd_code === code)
    if (!exists) {
      onChange([
        ...diagnoses,
        { icd_code: code, seq_num: diagnoses.length + 1, long_title: title },
      ])
    }
    setSearchQuery('')
    setShowDropdown(false)
  }

  const removeDiagnosis = (index: number) => {
    const updated = diagnoses.filter((_, i) => i !== index)
      .map((d, i) => ({ ...d, seq_num: i + 1 }))
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">Diagnoses (ICD Codes)</label>

      {/* Current diagnoses */}
      {diagnoses.length > 0 && (
        <div className="space-y-2">
          {diagnoses.map((d, i) => (
            <div key={i} className="flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-lg px-3 py-2">
              <span className="text-xs font-bold text-primary-600 bg-primary-100 rounded px-1.5 py-0.5">
                #{d.seq_num}
              </span>
              <span className="text-sm font-mono font-semibold text-primary-700">{d.icd_code}</span>
              <span className="text-sm text-slate-600 truncate flex-1">{d.long_title}</span>
              <button
                onClick={() => removeDiagnosis(i)}
                className="p-1 rounded hover:bg-primary-100 text-primary-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 bg-white">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true) }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search ICD codes or descriptions..."
            className="flex-1 text-sm outline-none bg-transparent"
          />
          {loading && <div className="w-4 h-4 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />}
        </div>

        {showDropdown && results.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {results.map((r) => (
              <button
                key={r._id}
                onClick={() => addDiagnosis(String(r.icd_code), r.long_title)}
                className="w-full text-left px-4 py-2.5 hover:bg-primary-50 flex items-center gap-3 border-b border-slate-50 last:border-0"
              >
                <span className="text-xs font-mono font-bold text-primary-600 bg-primary-50 rounded px-1.5 py-0.5 shrink-0">
                  {String(r.icd_code)}
                </span>
                <span className="text-sm text-slate-700 truncate">{r.long_title}</span>
                <Plus className="w-4 h-4 text-slate-400 shrink-0 ml-auto" />
              </button>
            ))}
          </div>
        )}
      </div>

      {showDropdown && searchQuery.length >= 2 && results.length === 0 && !loading && (
        <p className="text-xs text-slate-400 px-1">No matching ICD codes found</p>
      )}
    </div>
  )
}
