#!/bin/sh
# Generate runtime config.js from environment variables
API_BASE="${CAREPLANPLUS_API_BASE:-/careplanplus/api}"

cat > /usr/share/nginx/html/config.js <<EOF
window.__CAREPLANPLUS_CONFIG__ = {
  API_BASE: '${API_BASE}',
};
EOF

echo "CarePlanPlus UI config generated: API_BASE=${API_BASE}"
