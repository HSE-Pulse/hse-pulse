import { useState, useEffect } from 'react'
import { api } from '../api/client'
import type { HealthResponse } from '../types'

export function useHealth(intervalMs = 15000) {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const poll = () => {
      api.health()
        .then((h) => { if (active) { setHealth(h); setError(null) } })
        .catch((e) => { if (active) setError(e.message) })
    }

    poll()
    const id = setInterval(poll, intervalMs)
    return () => { active = false; clearInterval(id) }
  }, [intervalMs])

  return { health, error }
}
