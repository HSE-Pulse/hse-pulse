#!/bin/bash
# Decommission Cloud Run services

set -e

PROJECT_ID="hse-pulse-portfolio"
REGION="europe-west1"

echo "=== Decommissioning Cloud Run Services ==="

# Delete services
for service in landing medisync pulseflow; do
    echo "Deleting $service..."
    gcloud run services delete $service \
        --region=$REGION \
        --project=$PROJECT_ID \
        --quiet 2>/dev/null || echo "$service not found or already deleted"
done

# Optional: Delete cloud function
echo "Deleting demo-orchestrator function..."
gcloud functions delete demo-orchestrator \
    --region=$REGION \
    --project=$PROJECT_ID \
    --quiet 2>/dev/null || echo "Function not found or already deleted"

echo "=== Cloud Run Decommissioning Complete ==="
