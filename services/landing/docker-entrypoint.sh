#!/bin/sh
# Generate runtime config from environment variables
CONFIG_DIR="/usr/share/nginx/html"

cat > "${CONFIG_DIR}/config.js" <<EOF
window.__LANDING_CONFIG__ = {
  DESMARL_URL: '${DESMARL_URL:-https://medisync.harishankar.info}',
  CAREPLANPLUS_URL: '${CAREPLANPLUS_URL:-https://careplanplus.harishankar.info}',
  PULSENOTES_URL: '${PULSENOTES_URL:-https://pulsenotes.harishankar.info}',
  PULSEFLOW_URL: '${PULSEFLOW_URL:-https://pulseflow.harishankar.info}',
  MLFLOW_URL: '${MLFLOW_URL:-https://mlflow.harishankar.info}',
  GRAFANA_URL: '${GRAFANA_URL:-https://grafana.harishankar.info}',
  PROMETHEUS_URL: '${PROMETHEUS_URL:-https://prometheus.harishankar.info}',
  DASHBOARD_URL: '${DASHBOARD_URL:-https://dashboard.harishankar.info}',
};
EOF
