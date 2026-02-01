import { api } from '../api/client'
import { useApi } from './useApi'
import type { NiesSummary } from '../types'

export function useNiesSummary() {
  return useApi<NiesSummary>(() => api.niesSummary(), [])
}
