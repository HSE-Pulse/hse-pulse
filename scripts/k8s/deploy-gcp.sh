#!/bin/bash
# HSE-Pulse GCP GKE Deployment Script
# Deploys to Google Kubernetes Engine with GPU support

set -e

echo "=========================================="
echo "HSE-Pulse GCP GKE Deployment"
echo "=========================================="

# Configuration - Set these or use environment variables
PROJECT_ID=${GCP_PROJECT_ID:-"your-gcp-project"}
REGION=${GCP_REGION:-"europe-west1"}
ZONE=${GCP_ZONE:-"europe-west1-b"}
CLUSTER_NAME=${GKE_CLUSTER_NAME:-"hse-pulse-cluster"}
MACHINE_TYPE=${GKE_MACHINE_TYPE:-"e2-standard-4"}
GPU_MACHINE_TYPE=${GKE_GPU_MACHINE_TYPE:-"n1-standard-8"}
GPU_TYPE=${GKE_GPU_TYPE:-"nvidia-tesla-t4"}
GPU_COUNT=${GKE_GPU_COUNT:-1}
MIN_NODES=${GKE_MIN_NODES:-2}
MAX_NODES=${GKE_MAX_NODES:-10}
GPU_MIN_NODES=${GKE_GPU_MIN_NODES:-0}
GPU_MAX_NODES=${GKE_GPU_MAX_NODES:-3}

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."

    if ! command -v gcloud &> /dev/null; then
        echo "Error: gcloud CLI is not installed"
        echo "Install from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi

    if ! command -v kubectl &> /dev/null; then
        echo "Installing kubectl..."
        gcloud components install kubectl
    fi

    if ! command -v helm &> /dev/null; then
        echo "Installing helm..."
        curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
    fi

    echo "All prerequisites installed!"
}

# Authenticate and set project
setup_gcp() {
    echo "Setting up GCP..."

    # Check authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        echo "Please authenticate with GCP:"
        gcloud auth login
    fi

    # Set project
    gcloud config set project $PROJECT_ID
    gcloud config set compute/region $REGION
    gcloud config set compute/zone $ZONE

    # Enable required APIs
    echo "Enabling required GCP APIs..."
    gcloud services enable container.googleapis.com
    gcloud services enable containerregistry.googleapis.com
    gcloud services enable compute.googleapis.com

    echo "GCP setup complete!"
}

# Create GKE cluster
create_cluster() {
    echo "Creating GKE cluster..."

    # Check if cluster exists
    if gcloud container clusters describe $CLUSTER_NAME --zone=$ZONE &> /dev/null; then
        echo "Cluster $CLUSTER_NAME already exists. Skipping creation."
        return
    fi

    # Create cluster with autoscaling
    gcloud container clusters create $CLUSTER_NAME \
        --zone=$ZONE \
        --machine-type=$MACHINE_TYPE \
        --num-nodes=2 \
        --enable-autoscaling \
        --min-nodes=$MIN_NODES \
        --max-nodes=$MAX_NODES \
        --enable-autorepair \
        --enable-autoupgrade \
        --scopes=cloud-platform \
        --workload-pool=${PROJECT_ID}.svc.id.goog

    echo "GKE cluster created!"
}

# Add GPU node pool
add_gpu_nodepool() {
    echo "Adding GPU node pool..."

    # Check if GPU node pool exists
    if gcloud container node-pools describe gpu-pool --cluster=$CLUSTER_NAME --zone=$ZONE &> /dev/null; then
        echo "GPU node pool already exists. Skipping."
        return
    fi

    gcloud container node-pools create gpu-pool \
        --cluster=$CLUSTER_NAME \
        --zone=$ZONE \
        --machine-type=$GPU_MACHINE_TYPE \
        --accelerator=type=$GPU_TYPE,count=$GPU_COUNT \
        --num-nodes=0 \
        --enable-autoscaling \
        --min-nodes=$GPU_MIN_NODES \
        --max-nodes=$GPU_MAX_NODES \
        --node-taints=nvidia.com/gpu=present:NoSchedule

    # Install NVIDIA GPU drivers
    kubectl apply -f https://raw.githubusercontent.com/GoogleCloudPlatform/container-engine-accelerators/master/nvidia-driver-installer/cos/daemonset-preloaded-latest.yaml

    echo "GPU node pool added!"
}

# Configure kubectl
configure_kubectl() {
    echo "Configuring kubectl..."
    gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE
    echo "kubectl configured!"
}

# Push images to GCR
push_images() {
    echo "Building and pushing images to GCR..."

    # Configure Docker for GCR
    gcloud auth configure-docker

    cd "$(dirname "$0")/../.."

    # Build and push images
    for service in pulseflow careplanplus pulsenotes medisync; do
        echo "Building $service..."
        docker build -t gcr.io/${PROJECT_ID}/hse-pulse/${service}:latest ./services/${service}
        docker push gcr.io/${PROJECT_ID}/hse-pulse/${service}:latest
    done

    echo "Images pushed to GCR!"
}

# Deploy with Helm
deploy_helm() {
    echo "Deploying with Helm..."

    cd "$(dirname "$0")/../.."

    # Update dependencies
    helm dependency update ./helm/hse-pulse

    # Install/upgrade
    helm upgrade --install hse-pulse ./helm/hse-pulse \
        --namespace hse-pulse \
        --create-namespace \
        --set global.imageRegistry=gcr.io/${PROJECT_ID}/hse-pulse \
        --set cloudProvider.type=gcp \
        --set cloudProvider.gcp.project=${PROJECT_ID} \
        --set cloudProvider.gcp.region=${REGION} \
        --set training.gpu.enabled=true \
        --wait

    echo "Helm deployment complete!"
}

# Create external IP
create_external_ip() {
    echo "Setting up external access..."

    # Get ingress IP
    EXTERNAL_IP=$(kubectl get ingress hse-pulse-ingress -n hse-pulse -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")

    if [ -z "$EXTERNAL_IP" ]; then
        echo "Waiting for external IP..."
        sleep 30
        EXTERNAL_IP=$(kubectl get ingress hse-pulse-ingress -n hse-pulse -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
    fi

    echo "External IP: $EXTERNAL_IP"
}

# Show deployment status
show_status() {
    echo ""
    echo "=========================================="
    echo "HSE-Pulse GKE Deployment Complete!"
    echo "=========================================="
    echo ""
    kubectl get pods -n hse-pulse
    echo ""
    echo "Access your deployment at the external IP shown above."
    echo ""
    echo "Useful commands:"
    echo "  kubectl get pods -n hse-pulse"
    echo "  kubectl logs -f deployment/pulseflow -n hse-pulse"
    echo "  kubectl port-forward svc/pulseflow-service 8000:8000 -n hse-pulse"
}

# Main
main() {
    check_prerequisites
    setup_gcp
    create_cluster
    add_gpu_nodepool
    configure_kubectl
    push_images
    deploy_helm
    create_external_ip
    show_status
}

main "$@"
