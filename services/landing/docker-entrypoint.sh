#!/bin/sh
# Generate runtime config from environment variables
CONFIG_DIR="/usr/share/nginx/html"

cat > "${CONFIG_DIR}/config.js" <<EOF
window.__LANDING_CONFIG__ = {
  MEDISYNC_URL: '${MEDISYNC_URL:-/medisync/}',
  CAREPLANPLUS_URL: '${CAREPLANPLUS_URL:-/careplanplus/}',
  PULSENOTES_URL: '${PULSENOTES_URL:-/pulsenotes/}',
  MLFLOW_URL: '${MLFLOW_URL:-/mlflow/}',
  GRAFANA_URL: '${GRAFANA_URL:-/grafana/}',
  PROMETHEUS_URL: '${PROMETHEUS_URL:-/prometheus/}',
};
EOF
