#!/bin/bash
# Create GKE Standard Zonal Cluster (free tier - no management fee)

set -e

PROJECT_ID="hse-pulse-portfolio"
ZONE="europe-west1-b"
CLUSTER_NAME="hse-pulse-cluster"

echo "=== Creating GKE Standard Zonal Cluster ==="

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable container.googleapis.com --project=$PROJECT_ID
gcloud services enable dns.googleapis.com --project=$PROJECT_ID

# Create Standard zonal cluster with default node pool (always-on infrastructure)
echo "Creating Standard zonal cluster with default pool (e2-medium)..."
gcloud container clusters create $CLUSTER_NAME \
    --zone=$ZONE \
    --project=$PROJECT_ID \
    --machine-type=e2-medium \
    --num-nodes=1 \
    --no-enable-autoscaling \
    --disk-size=30 \
    --disk-type=pd-standard \
    --release-channel=regular \
    --enable-ip-alias \
    --workload-pool=${PROJECT_ID}.svc.id.goog

echo "Default node pool created (1x e2-medium, always-on)"

# Create spot ML node pool (on-demand, 0-1 nodes)
echo "Creating ML spot node pool (e2-standard-2, 0-1 nodes)..."
gcloud container node-pools create ml-pool \
    --cluster=$CLUSTER_NAME \
    --zone=$ZONE \
    --project=$PROJECT_ID \
    --machine-type=e2-standard-2 \
    --num-nodes=0 \
    --enable-autoscaling \
    --min-nodes=0 \
    --max-nodes=1 \
    --spot \
    --disk-size=30 \
    --disk-type=pd-standard \
    --node-taints=workload=ml:NoSchedule

echo "ML node pool created (0-1x e2-standard-2, spot, tainted)"

# Get credentials
echo "Getting cluster credentials..."
gcloud container clusters get-credentials $CLUSTER_NAME \
    --zone=$ZONE \
    --project=$PROJECT_ID

# Verify connection
echo "Verifying cluster connection..."
kubectl cluster-info

echo ""
echo "=== GKE Standard Zonal Cluster Created Successfully ==="
echo "Cluster: $CLUSTER_NAME"
echo "Zone: $ZONE"
echo "Default pool: 1x e2-medium (always-on, 4GB RAM)"
echo "ML pool: 0-1x e2-standard-2 (spot, 8GB RAM, tainted workload=ml:NoSchedule)"
