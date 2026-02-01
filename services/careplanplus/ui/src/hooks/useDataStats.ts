import { api } from '../api/client'
import { useApi } from './useApi'
import type { DataStats } from '../types'

export function useDataStats() {
  return useApi<DataStats>(() => api.dataStats(), [])
}
