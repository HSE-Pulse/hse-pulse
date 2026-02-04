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
  // MediSync always on
  DESMARL_URL: 'https://medisync.harishankar.info',
  // On-demand demos via activator (scale-to-zero)
  PULSEFLOW_URL: 'https://demo.harishankar.info/activate/pulseflow',
  CAREPLANPLUS_URL: 'https://demo.harishankar.info/activate/careplanplus',
  PULSENOTES_URL: 'https://demo.harishankar.info/activate/pulsenotes',
  // Observability dashboards
  MLFLOW_URL: 'https://mlflow.harishankar.info',
  GRAFANA_URL: 'https://grafana.harishankar.info',
  PROMETHEUS_URL: 'https://prometheus.harishankar.info',
}

export const config: LandingConfig = {
  ...defaults,
  ...window.__LANDING_CONFIG__,
}
