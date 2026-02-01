#!/bin/sh
# Generate runtime config.js from environment variables
API_BASE="${PULSENOTES_API_BASE:-/pulsenotes/api}"
DATA_BASE="${PULSENOTES_DATA_BASE:-/pulsenotes}"

cat > /usr/share/nginx/html/config.js <<EOF
window.__PULSENOTES_CONFIG__ = {
  API_BASE: '${API_BASE}',
  DATA_BASE: '${DATA_BASE}',
};
EOF

echo "PulseNotes UI config generated: API_BASE=${API_BASE}, DATA_BASE=${DATA_BASE}"
