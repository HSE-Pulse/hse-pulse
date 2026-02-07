interface LandingConfig {
  DESMARL_URL: string
  CAREPLANPLUS_URL: string
  PULSENOTES_URL: string
  PULSEFLOW_URL: string
  MLFLOW_URL: string
  GRAFANA_URL: string
  PROMETHEUS_URL: string
  DASHBOARD_URL: string
}

declare global {
  interface Window {
    __LANDING_CONFIG__?: Partial<LandingConfig>
  }
}

const defaults: LandingConfig = {
  // Demo services (always-on)
  DESMARL_URL: 'https://medisync.harishankar.info',
  PULSEFLOW_URL: 'https://pulseflow.harishankar.info',
  CAREPLANPLUS_URL: 'https://careplanplus.harishankar.info',
  PULSENOTES_URL: 'https://pulsenotes.harishankar.info',
  // Observability dashboards
  MLFLOW_URL: 'https://mlflow.harishankar.info',
  GRAFANA_URL: 'https://grafana.harishankar.info',
  PROMETHEUS_URL: 'https://prometheus.harishankar.info',
  DASHBOARD_URL: 'https://dashboard.harishankar.info',
}

export const config: LandingConfig = {
  ...defaults,
  ...window.__LANDING_CONFIG__,
}
