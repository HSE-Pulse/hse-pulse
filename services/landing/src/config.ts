interface LandingConfig {
  MEDISYNC_URL: string
  CAREPLANPLUS_URL: string
  PULSENOTES_URL: string
  MLFLOW_URL: string
  GRAFANA_URL: string
  PROMETHEUS_URL: string
}

declare global {
  interface Window {
    __LANDING_CONFIG__?: Partial<LandingConfig>
  }
}

const defaults: LandingConfig = {
  MEDISYNC_URL: '/medisync/',
  CAREPLANPLUS_URL: '/careplanplus/',
  PULSENOTES_URL: '/pulsenotes/',
  MLFLOW_URL: '/mlflow/',
  GRAFANA_URL: '/grafana/',
  PROMETHEUS_URL: '/prometheus/',
}

export const config: LandingConfig = {
  ...defaults,
  ...window.__LANDING_CONFIG__,
}
