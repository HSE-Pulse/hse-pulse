#!/bin/bash
# Deploy all services to GKE Standard Zonal

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Deploying HSE Pulse to GKE ==="

# Create namespace
echo "Creating namespace..."
kubectl apply -f "$SCRIPT_DIR/namespace.yaml"

# Deploy MongoDB (always on)
echo "Deploying MongoDB..."
kubectl apply -f "$SCRIPT_DIR/mongodb/deployment.yaml"

# Deploy landing page (always on)
echo "Deploying landing page..."
kubectl apply -f "$SCRIPT_DIR/landing/deployment.yaml"

# Deploy demo-activator (always on, manages on-demand scaling)
echo "Deploying demo-activator..."
kubectl apply -f "$SCRIPT_DIR/demo-activator/deployment.yaml"

# Deploy observability stack (always on)
echo "Deploying Prometheus..."
kubectl apply -f "$SCRIPT_DIR/observability/prometheus.yaml"
echo "Deploying Grafana..."
kubectl apply -f "$SCRIPT_DIR/observability/grafana.yaml"
echo "Deploying MLflow..."
kubectl apply -f "$SCRIPT_DIR/observability/mlflow.yaml"

# Deploy ML services at 0 replicas (on-demand via demo-activator)
echo "Deploying ML services (0 replicas, on-demand)..."
kubectl apply -f "$SCRIPT_DIR/medisync/deployment.yaml"
kubectl apply -f "$SCRIPT_DIR/pulseflow/deployment.yaml"
kubectl apply -f "$SCRIPT_DIR/careplanplus/deployment.yaml"
kubectl apply -f "$SCRIPT_DIR/pulsenotes/deployment.yaml"

# Deploy ingress + SSL
echo "Deploying ingress..."
kubectl apply -f "$SCRIPT_DIR/ingress-v4.yaml"

# Wait for infrastructure deployments
echo "Waiting for infrastructure pods to be ready..."
kubectl rollout status deployment/mongodb -n hse-pulse --timeout=300s
kubectl rollout status deployment/landing -n hse-pulse --timeout=300s
kubectl rollout status deployment/demo-activator -n hse-pulse --timeout=300s
kubectl rollout status deployment/prometheus -n hse-pulse --timeout=300s
kubectl rollout status deployment/grafana -n hse-pulse --timeout=300s
kubectl rollout status deployment/mlflow -n hse-pulse --timeout=300s

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Infrastructure pods:"
kubectl get pods -n hse-pulse
echo ""
echo "Deployments:"
kubectl get deployments -n hse-pulse
echo ""
echo "Ingress:"
kubectl get ingress -n hse-pulse
echo ""
echo "Note: SSL certificate provisioning takes 10-30 minutes"
echo "Check certificate status with:"
echo "  kubectl describe managedcertificate hse-pulse-cert -n hse-pulse"
echo ""
echo "ML services are at 0 replicas. They scale up via demo-activator."
echo "ML pods run on ml-pool (spot e2-standard-2, 0-1 nodes)."
