#!/bin/bash
# Deploy all services to GKE

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Deploying HSE Pulse to GKE ==="

# Create namespace
echo "Creating namespace..."
kubectl apply -f "$SCRIPT_DIR/namespace.yaml"

# Deploy landing page (always on)
echo "Deploying landing page..."
kubectl apply -f "$SCRIPT_DIR/landing/deployment.yaml"

# Deploy demo services (start at 0 replicas)
echo "Deploying demo services..."
kubectl apply -f "$SCRIPT_DIR/medisync/deployment.yaml"
kubectl apply -f "$SCRIPT_DIR/pulseflow/deployment.yaml"

# Deploy ingress
echo "Deploying ingress..."
kubectl apply -f "$SCRIPT_DIR/ingress.yaml"

# Wait for deployments
echo "Waiting for landing page to be ready..."
kubectl rollout status deployment/landing -n hse-pulse --timeout=300s

echo ""
echo "=== Deployment Complete ==="
echo ""
kubectl get pods -n hse-pulse
echo ""
kubectl get ingress -n hse-pulse
echo ""
echo "Note: SSL certificate provisioning takes 10-30 minutes"
echo "Check certificate status with:"
echo "  kubectl describe managedcertificate hse-pulse-cert -n hse-pulse"
