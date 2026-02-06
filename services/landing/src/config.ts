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
  // Demo services via activator (scales 0→1 on demand)
  DESMARL_URL: 'https://harishankar.info/activate/medisync',
  PULSEFLOW_URL: 'https://harishankar.info/activate/pulseflow',
  CAREPLANPLUS_URL: 'https://harishankar.info/activate/careplanplus',
  PULSENOTES_URL: 'https://harishankar.info/activate/pulsenotes',
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
