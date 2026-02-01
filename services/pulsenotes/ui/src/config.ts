declare global {
  interface Window {
    __PULSENOTES_CONFIG__?: {
      API_BASE?: string
      DATA_BASE?: string
    }
  }
}

const cfg = window.__PULSENOTES_CONFIG__ || {}

export const API_BASE = cfg.API_BASE || '/rag'
export const DATA_BASE = cfg.DATA_BASE || ''
