declare global {
  interface Window {
    __CAREPLANPLUS_CONFIG__?: {
      API_BASE?: string
    }
  }
}

const cfg = window.__CAREPLANPLUS_CONFIG__ || {}

export const API_BASE = cfg.API_BASE || '/careplanplus/api'
