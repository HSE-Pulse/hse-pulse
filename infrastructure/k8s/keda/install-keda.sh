#!/bin/bash
# Install KEDA on GKE

set -e

echo "=== Installing KEDA ==="

# Add KEDA Helm repo
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

# Install KEDA
helm install keda kedacore/keda \
    --namespace keda \
    --create-namespace \
    --wait

echo "=== KEDA Installed Successfully ==="
kubectl get pods -n keda
