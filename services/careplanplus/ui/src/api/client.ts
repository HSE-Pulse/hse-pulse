import { API_BASE } from '../config'
import type {
  HealthResponse,
  DataStats,
  PaginatedResponse,
  Patient,
  PatientDetail,
  Admission,
  DiagnosisIcd,
  ProcedureIcd,
  IcdCode,
  NiesRecord,
  NiesSummary,
  RecommendationRequest,
  RecommendationResponse,
  ServiceConfig,
  SampleCase,
} from '../types'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json()
}

export const api = {
  // Health & config
  health: () => request<HealthResponse>('/health'),
  getConfig: () => request<ServiceConfig>('/config'),
  updateConfig: (cfg: Partial<ServiceConfig>) =>
    request<{ status: string; config: ServiceConfig }>('/config', {
      method: 'POST',
      body: JSON.stringify(cfg),
    }),

  // Inference
  predict: (req: RecommendationRequest) =>
    request<RecommendationResponse>('/predict', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  pathway: (req: RecommendationRequest) =>
    request<RecommendationResponse>('/pathway', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  sampleDiagnoses: () =>
    request<{ samples: SampleCase[] }>('/sample-diagnoses'),

  // Training
  train: (cfg: { epochs: number; batch_size: number; learning_rate: string }) =>
    request<{ status: string; job_id: string }>('/train', {
      method: 'POST',
      body: JSON.stringify(cfg),
    }),

  // Data endpoints
  dataStats: () => request<DataStats>('/data/stats'),
  patients: (page = 1, perPage = 20) =>
    request<PaginatedResponse<Patient>>(`/data/patients?page=${page}&per_page=${perPage}`),
  patientDetail: (subjectId: number) =>
    request<PatientDetail>(`/data/patients/${subjectId}`),
  admissions: (subjectId?: number, page = 1, perPage = 20) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
    if (subjectId) params.set('subject_id', String(subjectId))
    return request<PaginatedResponse<Admission>>(`/data/admissions?${params}`)
  },
  diagnoses: (hadmId?: number, page = 1, perPage = 50) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
    if (hadmId) params.set('hadm_id', String(hadmId))
    return request<PaginatedResponse<DiagnosisIcd>>(`/data/diagnoses?${params}`)
  },
  procedures: (hadmId?: number, page = 1, perPage = 50) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
    if (hadmId) params.set('hadm_id', String(hadmId))
    return request<PaginatedResponse<ProcedureIcd>>(`/data/procedures?${params}`)
  },
  searchIcdDiagnoses: (q: string, limit = 20) =>
    request<IcdCode[]>(`/data/icd/diagnoses/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  searchIcdProcedures: (q: string, limit = 20) =>
    request<IcdCode[]>(`/data/icd/procedures/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  nies: (conditionLabel?: string, page = 1, perPage = 50) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
    if (conditionLabel) params.set('condition_label', conditionLabel)
    return request<PaginatedResponse<NiesRecord>>(`/data/nies?${params}`)
  },
  niesSummary: () => request<NiesSummary>('/data/nies/summary'),
}
