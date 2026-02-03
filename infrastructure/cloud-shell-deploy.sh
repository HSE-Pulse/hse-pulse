#!/bin/bash
#
# HSE-Pulse GCP Cloud Shell Deployment Script
#
# Run this in Google Cloud Shell:
#   1. Open https://console.cloud.google.com/cloudshell
#   2. Clone repo: git clone https://github.com/HSE-Pulse/hse-pulse.git
#   3. Run: cd hse-pulse/infrastructure && chmod +x cloud-shell-deploy.sh && ./cloud-shell-deploy.sh
#

set -e

# Configuration
PROJECT_ID="hse-pulse-portfolio"
REGION="europe-west1"
REPO_NAME="hse-pulse"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
header() { echo -e "\n${CYAN}═══════════════════════════════════════════${NC}\n${CYAN}  $1${NC}\n${CYAN}═══════════════════════════════════════════${NC}\n"; }

# Check if running in Cloud Shell
check_environment() {
    header "Checking Environment"

    if [ -z "$CLOUD_SHELL" ] && [ -z "$GOOGLE_CLOUD_SHELL" ]; then
        warn "Not running in Cloud Shell, but continuing anyway..."
    else
        log "Running in Google Cloud Shell"
    fi

    # Verify gcloud
    if ! command -v gcloud &> /dev/null; then
        error "gcloud not found"
    fi
    log "gcloud CLI available"

    # Verify docker
    if ! command -v docker &> /dev/null; then
        error "docker not found"
    fi
    log "Docker available"
}

# Setup project
setup_project() {
    header "Setting Up Project"

    gcloud config set project ${PROJECT_ID}
    log "Project set to ${PROJECT_ID}"

    # Enable APIs
    log "Enabling required APIs (this may take a minute)..."
    gcloud services enable \
        cloudfunctions.googleapis.com \
        run.googleapis.com \
        cloudbuild.googleapis.com \
        artifactregistry.googleapis.com \
        secretmanager.googleapis.com \
        --quiet
    log "APIs enabled"
}

# Setup Artifact Registry
setup_registry() {
    header "Setting Up Artifact Registry"

    # Check if registry exists
    if gcloud artifacts repositories describe ${REPO_NAME} --location=${REGION} &>/dev/null; then
        log "Artifact Registry already exists"
    else
        gcloud artifacts repositories create ${REPO_NAME} \
            --repository-format=docker \
            --location=${REGION} \
            --description="HSE-Pulse container images"
        log "Artifact Registry created"
    fi

    # Configure Docker auth
    gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
    log "Docker authentication configured"
}

# Build and push images
build_and_push() {
    header "Building and Pushing Container Images"

    cd "$(dirname "$0")/.."  # Go to repo root

    # Landing page
    log "Building landing page..."
    docker build -t ${REGISTRY}/landing:latest ./services/landing
    docker push ${REGISTRY}/landing:latest
    log "Landing page pushed"

    # CarePlanPlus
    if [ -d "./services/careplanplus" ]; then
        log "Building CarePlanPlus..."
        docker build -t ${REGISTRY}/careplanplus:latest ./services/careplanplus
        docker push ${REGISTRY}/careplanplus:latest
        log "CarePlanPlus pushed"
    fi

    # PulseNotes
    if [ -d "./services/pulsenotes" ]; then
        log "Building PulseNotes..."
        docker build -t ${REGISTRY}/pulsenotes:latest ./services/pulsenotes
        docker push ${REGISTRY}/pulsenotes:latest
        log "PulseNotes pushed"
    fi

    # PulseFlow
    if [ -d "./services/pulseflow" ]; then
        log "Building PulseFlow..."
        docker build -t ${REGISTRY}/pulseflow:latest ./services/pulseflow
        docker push ${REGISTRY}/pulseflow:latest
        log "PulseFlow pushed"
    fi

    # MediSync
    if [ -d "./services/medisync" ]; then
        log "Building MediSync..."
        docker build -t ${REGISTRY}/medisync:latest ./services/medisync
        docker push ${REGISTRY}/medisync:latest
        log "MediSync pushed"
    fi
}

# Deploy Cloud Functions
deploy_functions() {
    header "Deploying Cloud Functions"

    cd "$(dirname "$0")/cloud-functions/demo-orchestrator"

    log "Deploying demo-orchestrator function..."
    gcloud functions deploy demo-orchestrator \
        --gen2 \
        --runtime=python311 \
        --region=${REGION} \
        --source=. \
        --entry-point=demo_orchestrator \
        --trigger-http \
        --allow-unauthenticated \
        --set-env-vars=PROJECT_ID=${PROJECT_ID},REGION=${REGION} \
        --memory=256Mi \
        --quiet

    log "Deploying check-status function..."
    gcloud functions deploy check-status \
        --gen2 \
        --runtime=python311 \
        --region=${REGION} \
        --source=. \
        --entry-point=check_status \
        --trigger-http \
        --allow-unauthenticated \
        --set-env-vars=PROJECT_ID=${PROJECT_ID},REGION=${REGION} \
        --memory=256Mi \
        --quiet

    # Get URLs
    ORCHESTRATOR_URL=$(gcloud functions describe demo-orchestrator --region=${REGION} --format='value(url)')
    STATUS_URL=$(gcloud functions describe check-status --region=${REGION} --format='value(url)')

    log "Orchestrator: ${ORCHESTRATOR_URL}"
    log "Status Check: ${STATUS_URL}"

    cd - > /dev/null
}

# Deploy Landing Page (24/7)
deploy_landing() {
    header "Deploying Landing Page (24/7)"

    ORCHESTRATOR_URL=$(gcloud functions describe demo-orchestrator --region=${REGION} --format='value(url)')
    STATUS_URL=$(gcloud functions describe check-status --region=${REGION} --format='value(url)')

    gcloud run deploy landing \
        --image=${REGISTRY}/landing:latest \
        --region=${REGION} \
        --platform=managed \
        --allow-unauthenticated \
        --min-instances=1 \
        --max-instances=3 \
        --memory=256Mi \
        --cpu=1 \
        --port=80 \
        --set-env-vars="VITE_ORCHESTRATOR_URL=${ORCHESTRATOR_URL},VITE_STATUS_URL=${STATUS_URL}" \
        --quiet

    LANDING_URL=$(gcloud run services describe landing --region=${REGION} --format='value(status.url)')
    log "Landing page deployed: ${LANDING_URL}"
}

# Deploy ML Services (Scale to Zero)
deploy_ml_services() {
    header "Deploying ML Services (Scale to Zero)"

    # CarePlanPlus - BERT model needs more resources
    log "Deploying CarePlanPlus..."
    gcloud run deploy careplanplus \
        --image=${REGISTRY}/careplanplus:latest \
        --region=${REGION} \
        --platform=managed \
        --allow-unauthenticated \
        --min-instances=0 \
        --max-instances=2 \
        --memory=2Gi \
        --cpu=2 \
        --port=8000 \
        --timeout=300 \
        --quiet || warn "CarePlanPlus deployment failed (may need more quota)"

    # PulseNotes - RAG pipeline
    log "Deploying PulseNotes..."
    gcloud run deploy pulsenotes \
        --image=${REGISTRY}/pulsenotes:latest \
        --region=${REGION} \
        --platform=managed \
        --allow-unauthenticated \
        --min-instances=0 \
        --max-instances=2 \
        --memory=1Gi \
        --cpu=1 \
        --port=8000 \
        --timeout=300 \
        --quiet || warn "PulseNotes deployment failed"

    # PulseFlow - LSTM forecasting
    log "Deploying PulseFlow..."
    gcloud run deploy pulseflow \
        --image=${REGISTRY}/pulseflow:latest \
        --region=${REGION} \
        --platform=managed \
        --allow-unauthenticated \
        --min-instances=0 \
        --max-instances=2 \
        --memory=512Mi \
        --cpu=1 \
        --port=8000 \
        --timeout=300 \
        --quiet || warn "PulseFlow deployment failed"

    # MediSync - Multi-agent RL
    log "Deploying MediSync..."
    gcloud run deploy medisync \
        --image=${REGISTRY}/medisync:latest \
        --region=${REGION} \
        --platform=managed \
        --allow-unauthenticated \
        --min-instances=0 \
        --max-instances=2 \
        --memory=1Gi \
        --cpu=1 \
        --port=8000 \
        --timeout=300 \
        --quiet || warn "MediSync deployment failed"

    log "ML services deployed with scale-to-zero"
}

# Print summary
print_summary() {
    header "Deployment Complete!"

    LANDING_URL=$(gcloud run services describe landing --region=${REGION} --format='value(status.url)' 2>/dev/null || echo "Not deployed")
    ORCHESTRATOR_URL=$(gcloud functions describe demo-orchestrator --region=${REGION} --format='value(url)' 2>/dev/null || echo "Not deployed")

    echo -e "${GREEN}Portfolio URL:${NC} ${LANDING_URL}"
    echo ""
    echo -e "${CYAN}Services Deployed:${NC}"
    echo "  • Landing Page (24/7, min=1 instance)"
    echo "  • CarePlanPlus (scale-to-zero)"
    echo "  • PulseNotes (scale-to-zero)"
    echo "  • PulseFlow (scale-to-zero)"
    echo "  • MediSync (scale-to-zero)"
    echo ""
    echo -e "${CYAN}Cloud Functions:${NC}"
    echo "  • Demo Orchestrator: ${ORCHESTRATOR_URL}"
    echo ""
    echo -e "${CYAN}Estimated Monthly Cost:${NC}"
    echo "  • Base (landing 24/7): ~\$5-7"
    echo "  • Per demo session: ~\$0.02-0.05"
    echo "  • Total (20 demos/month): ~\$8-10"
    echo ""
    echo -e "${CYAN}Useful Commands:${NC}"
    echo "  • View logs: gcloud run services logs read landing --region=${REGION}"
    echo "  • List services: gcloud run services list --region=${REGION}"
    echo "  • View costs: https://console.cloud.google.com/billing"
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Open your portfolio: ${LANDING_URL}${NC}"
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
}

# Main
main() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║     HSE-Pulse GCP Deployment (Cloud Shell)                ║"
    echo "║     Project: ${PROJECT_ID}                        ║"
    echo "║     Region: ${REGION}                              ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""

    check_environment
    setup_project
    setup_registry
    build_and_push
    deploy_functions
    deploy_landing
    deploy_ml_services
    print_summary
}

# Run
main "$@"
