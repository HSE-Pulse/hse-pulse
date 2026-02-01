#!/bin/sh
# Generate runtime config.js from environment variables
API_BASE="${MEDISYNC_API_BASE:-/medisync/api}"
WS_BASE="${MEDISYNC_WS_BASE:-}"

# Derive WS URL from API_BASE if not explicitly set
if [ -z "$WS_BASE" ]; then
    WS_BASE="/medisync/ws"
fi

cat > /usr/share/nginx/html/config.js <<EOF
window.__MEDISYNC_CONFIG__ = {
  API_BASE: '${API_BASE}',
  WS_URL: '${WS_BASE}',
};
EOF

echo "MediSync UI config generated: API_BASE=${API_BASE}, WS_URL=${WS_BASE}"
