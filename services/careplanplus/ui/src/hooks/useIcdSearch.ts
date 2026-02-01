import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'
import type { IcdCode } from '../types'

export function useIcdSearch(query: string, type: 'diagnoses' | 'procedures' = 'diagnoses') {
  const [results, setResults] = useState<IcdCode[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (!query || query.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    timerRef.current = setTimeout(() => {
      const search = type === 'diagnoses' ? api.searchIcdDiagnoses : api.searchIcdProcedures
      search(query, 15)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 300)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, type])

  return { results, loading }
}
