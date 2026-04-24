#!/bin/bash
# HSE-Pulse Minikube Setup Script
# Sets up a local Kubernetes cluster with GPU support for development

set -e

echo "=========================================="
echo "HSE-Pulse Minikube Setup"
echo "=========================================="

# Configuration
MINIKUBE_MEMORY=${MINIKUBE_MEMORY:-8192}
MINIKUBE_CPUS=${MINIKUBE_CPUS:-4}
MINIKUBE_DISK=${MINIKUBE_DISK:-50g}
ENABLE_GPU=${ENABLE_GPU:-false}

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo "Error: Docker is not installed"
        exit 1
    fi

    # Check minikube
    if ! command -v minikube &> /dev/null; then
        echo "Installing minikube..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install minikube
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
            sudo install minikube-linux-amd64 /usr/local/bin/minikube
        fi
    fi

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        echo "Installing kubectl..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install kubectl
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
            sudo install kubectl /usr/local/bin/kubectl
        fi
    fi

    # Check helm
    if ! command -v helm &> /dev/null; then
        echo "Installing helm..."
        curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
    fi

    echo "All prerequisites installed!"
}

# Start minikube
start_minikube() {
    echo "Starting minikube..."

    MINIKUBE_ARGS="--memory=${MINIKUBE_MEMORY} --cpus=${MINIKUBE_CPUS} --disk-size=${MINIKUBE_DISK}"

    if [ "$ENABLE_GPU" = true ]; then
        echo "Enabling GPU support..."
        # For GPU support, use docker driver with nvidia runtime
        MINIKUBE_ARGS="$MINIKUBE_ARGS --driver=docker --container-runtime=docker"

        # Check for NVIDIA GPU
        if command -v nvidia-smi &> /dev/null; then
            MINIKUBE_ARGS="$MINIKUBE_ARGS --gpus=all"
        else
            echo "Warning: nvidia-smi not found. GPU support may not work."
        fi
    else
        MINIKUBE_ARGS="$MINIKUBE_ARGS --driver=docker"
    fi

    minikube start $MINIKUBE_ARGS

    echo "Minikube started successfully!"
}

# Enable addons
enable_addons() {
    echo "Enabling minikube addons..."

    minikube addons enable ingress
    minikube addons enable metrics-server
    minikube addons enable dashboard
    minikube addons enable storage-provisioner

    if [ "$ENABLE_GPU" = true ]; then
        # Install NVIDIA device plugin
        kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.3/nvidia-device-plugin.yml
    fi

    echo "Addons enabled!"
}

# Build and load images
build_images() {
    echo "Building and loading Docker images into minikube..."

    # Point Docker to minikube's Docker daemon
    eval $(minikube docker-env)

    # Build images
    cd "$(dirname "$0")/../.."

    docker build -t hse-pulse/pulseflow:latest ./services/pulseflow
    docker build -t hse-pulse/careplanplus:latest ./services/careplanplus
    docker build -t hse-pulse/pulsenotes:latest ./services/pulsenotes
    docker build -t hse-pulse/medisync:latest ./services/medisync

    echo "Images built and loaded!"
}

# Deploy to minikube
deploy() {
    echo "Deploying HSE-Pulse to minikube..."

    # Create namespace
    kubectl apply -f k8s/base/namespace.yaml

    # Apply configurations
    kubectl apply -f k8s/base/configmap.yaml
    if [ ! -f k8s/base/secrets.yaml ]; then
        echo "k8s/base/secrets.yaml missing — copy secrets.yaml.example and fill in real values before rerunning." >&2
        exit 1
    fi
    kubectl apply -f k8s/base/secrets.yaml
    kubectl apply -f k8s/base/storage.yaml
    kubectl apply -f k8s/base/mongodb.yaml
    kubectl apply -f k8s/base/services.yaml
    kubectl apply -f k8s/base/ingress.yaml

    # Wait for deployments
    echo "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/mongodb -n hse-pulse
    kubectl wait --for=condition=available --timeout=300s deployment/pulseflow -n hse-pulse
    kubectl wait --for=condition=available --timeout=300s deployment/careplanplus -n hse-pulse
    kubectl wait --for=condition=available --timeout=300s deployment/pulsenotes -n hse-pulse
    kubectl wait --for=condition=available --timeout=300s deployment/medisync -n hse-pulse

    echo "Deployment complete!"
}

# Display access information
show_access_info() {
    echo ""
    echo "=========================================="
    echo "HSE-Pulse is now running!"
    echo "=========================================="
    echo ""
    echo "Access URLs (run 'minikube tunnel' in another terminal):"
    MINIKUBE_IP=$(minikube ip)
    echo "  - PulseFlow:    http://${MINIKUBE_IP}/pulseflow"
    echo "  - CarePlanPlus: http://${MINIKUBE_IP}/careplanplus"
    echo "  - PulseNotes:   http://${MINIKUBE_IP}/pulsenotes"
    echo "  - MediSync:     http://${MINIKUBE_IP}/medisync"
    echo ""
    echo "Dashboard: minikube dashboard"
    echo ""
    echo "To stop: minikube stop"
    echo "To delete: minikube delete"
}

# Main
main() {
    check_prerequisites
    start_minikube
    enable_addons
    build_images
    deploy
    show_access_info
}

main "$@"
