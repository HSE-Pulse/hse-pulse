#!/bin/bash
# Decommission Cloud Run services (all 8 services)

set -e

PROJECT_ID="hse-pulse-portfolio"
REGION="europe-west1"

echo "=== Decommissioning Cloud Run Services ==="

# Delete all 8 Cloud Run services
for service in landing medisync medisync-ui pulseflow-api pulseflow-ui careplanplus-api careplanplus-ui pulsenotes-api pulsenotes-ui demo-activator; do
    echo "Deleting $service..."
    gcloud run services delete $service \
        --region=$REGION \
        --project=$PROJECT_ID \
        --quiet 2>/dev/null || echo "$service not found or already deleted"
done

echo "=== Cloud Run Decommissioning Complete ==="
