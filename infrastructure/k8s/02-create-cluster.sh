#!/bin/bash
# Create GKE Autopilot Cluster

set -e

PROJECT_ID="hse-pulse-portfolio"
REGION="europe-west1"
CLUSTER_NAME="hse-pulse-cluster"

echo "=== Creating GKE Autopilot Cluster ==="

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable container.googleapis.com --project=$PROJECT_ID
gcloud services enable dns.googleapis.com --project=$PROJECT_ID

# Create Autopilot cluster
echo "Creating Autopilot cluster (this takes ~5-10 minutes)..."
gcloud container clusters create-auto $CLUSTER_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --release-channel=regular

# Get credentials
echo "Getting cluster credentials..."
gcloud container clusters get-credentials $CLUSTER_NAME \
    --region=$REGION \
    --project=$PROJECT_ID

# Verify connection
echo "Verifying cluster connection..."
kubectl cluster-info

echo "=== GKE Cluster Created Successfully ==="
echo "Cluster: $CLUSTER_NAME"
echo "Region: $REGION"
