import { API_BASE } from '../config'
import type {
  HealthResponse,
  Hospital,
  LatestDateResponse,
  PredictionRequest,
  PredictionResponse,
  TrolleyDataResponse,
  TrainingConfig,
  TrainingResponse,
  TrainingStatus,
  ServiceConfig,
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
  predict: (req: PredictionRequest) =>
    request<PredictionResponse>('/predict', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  // Hospitals
  hospitals: () =>
    request<{ hospitals: Hospital[] }>('/hospitals'),

  // Historical data
  latestDate: () =>
    request<LatestDateResponse>('/data/latest-date'),
  trolleyData: (hospitalCode: string, days = 30) =>
    request<TrolleyDataResponse>(`/trolley-data/${hospitalCode}?days=${days}`),

  // Training
  train: (cfg: TrainingConfig) =>
    request<TrainingResponse>('/train', {
      method: 'POST',
      body: JSON.stringify(cfg),
    }),
  trainingStatus: (jobId: string) =>
    request<TrainingStatus>(`/train/status/${jobId}`),
}
