#!/bin/sh
# Generate runtime config from environment variables
CONFIG_DIR="/usr/share/nginx/html"

cat > "${CONFIG_DIR}/config.js" <<EOF
window.__LANDING_CONFIG__ = {
  DESMARL_URL: '${DESMARL_URL:-https://harishankar.info/activate/medisync}',
  CAREPLANPLUS_URL: '${CAREPLANPLUS_URL:-https://harishankar.info/activate/careplanplus}',
  PULSENOTES_URL: '${PULSENOTES_URL:-https://harishankar.info/activate/pulsenotes}',
  PULSEFLOW_URL: '${PULSEFLOW_URL:-https://harishankar.info/activate/pulseflow}',
  MLFLOW_URL: '${MLFLOW_URL:-https://mlflow.harishankar.info}',
  GRAFANA_URL: '${GRAFANA_URL:-https://grafana.harishankar.info}',
  PROMETHEUS_URL: '${PROMETHEUS_URL:-https://prometheus.harishankar.info}',
  DASHBOARD_URL: '${DASHBOARD_URL:-https://dashboard.harishankar.info}',
};
EOF
