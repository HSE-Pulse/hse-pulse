declare global {
  interface Window {
    __PULSEFLOW_CONFIG__?: {
      API_BASE?: string
    }
  }
}

const cfg = window.__PULSEFLOW_CONFIG__ || {}
export const API_BASE = cfg.API_BASE || '/pulseflow/api'
