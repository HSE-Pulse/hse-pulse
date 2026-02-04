interface LandingConfig {
  DESMARL_URL: string
  CAREPLANPLUS_URL: string
  PULSENOTES_URL: string
  PULSEFLOW_URL: string
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
  // GKE deployed services on dedicated subdomains (HTTP until SSL provisioned)
  DESMARL_URL: 'http://medisync.harishankar.info',
  PULSEFLOW_URL: 'http://pulseflow.harishankar.info',
  CAREPLANPLUS_URL: 'http://careplanplus.harishankar.info',
  PULSENOTES_URL: 'http://pulsenotes.harishankar.info',
  // Observability dashboards
  MLFLOW_URL: 'http://mlflow.harishankar.info',
  GRAFANA_URL: 'http://grafana.harishankar.info',
  PROMETHEUS_URL: 'http://prometheus.harishankar.info',
}

export const config: LandingConfig = {
  ...defaults,
  ...window.__LANDING_CONFIG__,
}
