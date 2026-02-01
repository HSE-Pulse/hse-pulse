import { useState } from 'react'
import { Search } from 'lucide-react'
import { useIcdSearch } from '../hooks/useIcdSearch'
import type { IcdCode } from '../types'

interface IcdSearchProps {
  type: 'diagnoses' | 'procedures'
  onSelect?: (code: IcdCode) => void
}

export default function IcdSearch({ type, onSelect }: IcdSearchProps) {
  const [query, setQuery] = useState('')
  const { results, loading } = useIcdSearch(query, type)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 bg-white">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ICD ${type}...`}
          className="flex-1 text-sm outline-none bg-transparent"
        />
        {loading && <div className="w-4 h-4 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />}
      </div>

      {results.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg max-h-60 overflow-y-auto divide-y divide-slate-50">
          {results.map((r) => (
            <button
              key={r._id}
              onClick={() => onSelect?.(r)}
              className="w-full text-left px-4 py-2.5 hover:bg-primary-50 flex items-center gap-3"
            >
              <span className="text-xs font-mono font-bold text-primary-600 bg-primary-50 rounded px-1.5 py-0.5 shrink-0">
                {String(r.icd_code)}
              </span>
              <span className="text-sm text-slate-700 truncate">{r.long_title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
