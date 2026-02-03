#!/bin/bash
#
# HSE-Pulse GCP Deployment Script
# Deploys 24/7 landing page with on-demand ML demo clusters
#
# Usage: ./gcp-deploy.sh [PROJECT_ID] [REGION]
#

set -e

# Configuration
PROJECT_ID="${1:-hse-pulse-portfolio}"
REGION="${2:-europe-west1}"
REPO_NAME="hse-pulse"

echo "============================================"
echo "HSE-Pulse GCP Deployment"
echo "============================================"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi

    if ! command -v docker &> /dev/null; then
        log_error "Docker not found. Install from: https://docs.docker.com/get-docker/"
        exit 1
    fi

    log_info "Prerequisites OK"
}

# Setup GCP project
setup_project() {
    log_info "Setting up GCP project..."

    # Set project
    gcloud config set project $PROJECT_ID 2>/dev/null || {
        log_warn "Project doesn't exist, creating..."
        gcloud projects create $PROJECT_ID --name="HSE Pulse Portfolio"
        gcloud config set project $PROJECT_ID
    }

    # Enable APIs
    log_info "Enabling required APIs..."
    gcloud services enable \
        cloudfunctions.googleapis.com \
        run.googleapis.com \
        cloudbuild.googleapis.com \
        artifactregistry.googleapis.com \
        secretmanager.googleapis.com \
        --quiet

    log_info "Project setup complete"
}

# Create Artifact Registry
setup_registry() {
    log_info "Setting up Artifact Registry..."

    gcloud artifacts repositories describe $REPO_NAME \
        --location=$REGION 2>/dev/null || {
        gcloud artifacts repositories create $REPO_NAME \
            --repository-format=docker \
            --location=$REGION \
            --description="HSE-Pulse container images"
    }

    # Configure Docker auth
    gcloud auth configure-docker $REGION-docker.pkg.dev --quiet

    log_info "Artifact Registry ready"
}

# Build and push container images
build_images() {
    log_info "Building and pushing container images..."

    REGISTRY="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME"

    # Build landing page
    log_info "Building landing page..."
    docker build -t $REGISTRY/landing:latest ./services/landing
    docker push $REGISTRY/landing:latest

    # Build ML services
    for service in careplanplus pulsenotes pulseflow medisync; do
        if [ -d "./services/$service" ]; then
            log_info "Building $service..."
            docker build -t $REGISTRY/$service:latest ./services/$service
            docker push $REGISTRY/$service:latest
        fi
    done

    log_info "All images pushed to registry"
}

# Deploy Cloud Functions
deploy_functions() {
    log_info "Deploying Cloud Functions..."

    cd infrastructure/cloud-functions/demo-orchestrator

    # Deploy orchestrator
    gcloud functions deploy demo-orchestrator \
        --gen2 \
        --runtime=python311 \
        --region=$REGION \
        --source=. \
        --entry-point=demo_orchestrator \
        --trigger-http \
        --allow-unauthenticated \
        --set-env-vars=PROJECT_ID=$PROJECT_ID,REGION=$REGION \
        --quiet

    # Deploy status checker
    gcloud functions deploy check-status \
        --gen2 \
        --runtime=python311 \
        --region=$REGION \
        --source=. \
        --entry-point=check_status \
        --trigger-http \
        --allow-unauthenticated \
        --set-env-vars=PROJECT_ID=$PROJECT_ID,REGION=$REGION \
        --quiet

    cd ../../..

    # Get function URLs
    ORCHESTRATOR_URL=$(gcloud functions describe demo-orchestrator --region=$REGION --format='value(url)')
    STATUS_URL=$(gcloud functions describe check-status --region=$REGION --format='value(url)')

    log_info "Orchestrator URL: $ORCHESTRATOR_URL"
    log_info "Status URL: $STATUS_URL"

    # Export for landing page deployment
    export ORCHESTRATOR_URL
    export STATUS_URL
}

# Deploy landing page to Cloud Run
deploy_landing() {
    log_info "Deploying landing page to Cloud Run..."

    REGISTRY="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME"

    gcloud run deploy landing \
        --image=$REGISTRY/landing:latest \
        --region=$REGION \
        --platform=managed \
        --allow-unauthenticated \
        --min-instances=1 \
        --max-instances=3 \
        --memory=256Mi \
        --cpu=1 \
        --port=80 \
        --set-env-vars="VITE_ORCHESTRATOR_URL=$ORCHESTRATOR_URL,VITE_STATUS_URL=$STATUS_URL" \
        --quiet

    LANDING_URL=$(gcloud run services describe landing --region=$REGION --format='value(status.url)')

    log_info "Landing page deployed: $LANDING_URL"
}

# Deploy ML services (scale to zero)
deploy_ml_services() {
    log_info "Deploying ML services (scale-to-zero)..."

    REGISTRY="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME"

    # CarePlanPlus
    gcloud run deploy careplanplus \
        --image=$REGISTRY/careplanplus:latest \
        --region=$REGION \
        --platform=managed \
        --allow-unauthenticated \
        --min-instances=0 \
        --max-instances=2 \
        --memory=2Gi \
        --cpu=2 \
        --port=8000 \
        --timeout=300 \
        --quiet || log_warn "CarePlanPlus deployment skipped"

    # PulseNotes
    gcloud run deploy pulsenotes \
        --image=$REGISTRY/pulsenotes:latest \
        --region=$REGION \
        --platform=managed \
        --allow-unauthenticated \
        --min-instances=0 \
        --max-instances=2 \
        --memory=1Gi \
        --cpu=1 \
        --port=8000 \
        --timeout=300 \
        --quiet || log_warn "PulseNotes deployment skipped"

    # PulseFlow
    gcloud run deploy pulseflow \
        --image=$REGISTRY/pulseflow:latest \
        --region=$REGION \
        --platform=managed \
        --allow-unauthenticated \
        --min-instances=0 \
        --max-instances=2 \
        --memory=512Mi \
        --cpu=1 \
        --port=8000 \
        --timeout=300 \
        --quiet || log_warn "PulseFlow deployment skipped"

    # MediSync
    gcloud run deploy medisync \
        --image=$REGISTRY/medisync:latest \
        --region=$REGION \
        --platform=managed \
        --allow-unauthenticated \
        --min-instances=0 \
        --max-instances=2 \
        --memory=1Gi \
        --cpu=1 \
        --port=8000 \
        --timeout=300 \
        --quiet || log_warn "MediSync deployment skipped"

    log_info "ML services deployed (scale-to-zero enabled)"
}

# Print summary
print_summary() {
    LANDING_URL=$(gcloud run services describe landing --region=$REGION --format='value(status.url)' 2>/dev/null || echo "Not deployed")

    echo ""
    echo "============================================"
    echo "Deployment Complete!"
    echo "============================================"
    echo ""
    echo "Portfolio URL: $LANDING_URL"
    echo ""
    echo "Services (scale-to-zero):"
    echo "  - CarePlanPlus: Spins up on demo click"
    echo "  - PulseNotes: Spins up on demo click"
    echo "  - PulseFlow: Spins up on demo click"
    echo "  - MediSync: Spins up on demo click"
    echo ""
    echo "Estimated Monthly Cost:"
    echo "  - Base (24/7 landing): ~\$5-7"
    echo "  - Per demo session: ~\$0.02-0.05"
    echo "  - Total (20 demos/month): ~\$8-10"
    echo ""
    echo "Management Commands:"
    echo "  - View logs: gcloud run services logs read landing --region=$REGION"
    echo "  - View costs: https://console.cloud.google.com/billing"
    echo "============================================"
}

# Main execution
main() {
    check_prerequisites
    setup_project
    setup_registry
    build_images
    deploy_functions
    deploy_landing
    deploy_ml_services
    print_summary
}

# Run main function
main
