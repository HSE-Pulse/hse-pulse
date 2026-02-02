#!/bin/sh
# Generate runtime config.js from environment variables
API_BASE="${PULSEFLOW_API_BASE:-/pulseflow/api}"

cat > /usr/share/nginx/html/config.js <<EOF
window.__PULSEFLOW_CONFIG__ = {
  API_BASE: '${API_BASE}',
};
EOF

echo "PulseFlow UI config generated: API_BASE=${API_BASE}"
