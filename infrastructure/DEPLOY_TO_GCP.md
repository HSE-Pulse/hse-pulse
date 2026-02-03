# Deploy HSE-Pulse to GCP - Step by Step

## Prerequisites

### 1. Install Google Cloud SDK

**Windows (PowerShell as Administrator):**
```powershell
# Download and run installer
(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
& "$env:Temp\GoogleCloudSDKInstaller.exe"
```

Or download manually: https://cloud.google.com/sdk/docs/install#windows

**After installation, restart terminal and verify:**
```bash
gcloud --version
```

### 2. Authenticate with GCP

```bash
# Login to GCP
gcloud auth login

# Set default project (create one at https://console.cloud.google.com if needed)
gcloud config set project hse-pulse-portfolio

# Enable billing at https://console.cloud.google.com/billing
```

---

## Quick Deploy Commands

Run these commands in order from the `hse-pulse` directory:

### Step 1: Configure Project

```bash
# Set variables
$PROJECT_ID = "hse-pulse-portfolio"
$REGION = "europe-west1"

# Create project (skip if exists)
gcloud projects create $PROJECT_ID --name="HSE Pulse Portfolio"

# Set as default
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable cloudfunctions.googleapis.com run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

### Step 2: Create Artifact Registry

```bash
# Create container registry
gcloud artifacts repositories create hse-pulse --repository-format=docker --location=$REGION --description="HSE-Pulse images"

# Configure Docker authentication
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

### Step 3: Build and Push Images

```bash
# Set registry path
$REGISTRY = "europe-west1-docker.pkg.dev/hse-pulse-portfolio/hse-pulse"

# Build and push landing page
cd D:\project-demo\hse-pulse\services\landing
docker build -t ${REGISTRY}/landing:latest .
docker push ${REGISTRY}/landing:latest

# Build and push CarePlanPlus
cd D:\project-demo\hse-pulse\services\careplanplus
docker build -t ${REGISTRY}/careplanplus:latest .
docker push ${REGISTRY}/careplanplus:latest

# Build and push PulseNotes
cd D:\project-demo\hse-pulse\services\pulsenotes
docker build -t ${REGISTRY}/pulsenotes:latest .
docker push ${REGISTRY}/pulsenotes:latest

# Build and push PulseFlow
cd D:\project-demo\hse-pulse\services\pulseflow
docker build -t ${REGISTRY}/pulseflow:latest .
docker push ${REGISTRY}/pulseflow:latest

# Build and push MediSync
cd D:\project-demo\hse-pulse\services\medisync
docker build -t ${REGISTRY}/medisync:latest .
docker push ${REGISTRY}/medisync:latest
```

### Step 4: Deploy Cloud Functions

```bash
cd D:\project-demo\hse-pulse\infrastructure\cloud-functions\demo-orchestrator

# Deploy orchestrator function
gcloud functions deploy demo-orchestrator --gen2 --runtime=python311 --region=europe-west1 --source=. --entry-point=demo_orchestrator --trigger-http --allow-unauthenticated --set-env-vars=PROJECT_ID=hse-pulse-portfolio,REGION=europe-west1

# Deploy status check function
gcloud functions deploy check-status --gen2 --runtime=python311 --region=europe-west1 --source=. --entry-point=check_status --trigger-http --allow-unauthenticated --set-env-vars=PROJECT_ID=hse-pulse-portfolio,REGION=europe-west1

# Get function URLs
gcloud functions describe demo-orchestrator --region=europe-west1 --format="value(url)"
gcloud functions describe check-status --region=europe-west1 --format="value(url)"
```

### Step 5: Deploy Landing Page (24/7)

```bash
# Get function URLs first
$ORCHESTRATOR_URL = gcloud functions describe demo-orchestrator --region=europe-west1 --format="value(url)"
$STATUS_URL = gcloud functions describe check-status --region=europe-west1 --format="value(url)"

# Deploy landing page with always-on instance
gcloud run deploy landing --image=europe-west1-docker.pkg.dev/hse-pulse-portfolio/hse-pulse/landing:latest --region=europe-west1 --platform=managed --allow-unauthenticated --min-instances=1 --max-instances=3 --memory=256Mi --cpu=1 --port=80 --set-env-vars="VITE_ORCHESTRATOR_URL=$ORCHESTRATOR_URL,VITE_STATUS_URL=$STATUS_URL"

# Get landing URL
gcloud run services describe landing --region=europe-west1 --format="value(status.url)"
```

### Step 6: Deploy ML Services (Scale to Zero)

```bash
# CarePlanPlus (BERT model - needs more resources)
gcloud run deploy careplanplus --image=europe-west1-docker.pkg.dev/hse-pulse-portfolio/hse-pulse/careplanplus:latest --region=europe-west1 --platform=managed --allow-unauthenticated --min-instances=0 --max-instances=2 --memory=2Gi --cpu=2 --port=8000 --timeout=300

# PulseNotes (RAG pipeline)
gcloud run deploy pulsenotes --image=europe-west1-docker.pkg.dev/hse-pulse-portfolio/hse-pulse/pulsenotes:latest --region=europe-west1 --platform=managed --allow-unauthenticated --min-instances=0 --max-instances=2 --memory=1Gi --cpu=1 --port=8000 --timeout=300

# PulseFlow (LSTM forecasting)
gcloud run deploy pulseflow --image=europe-west1-docker.pkg.dev/hse-pulse-portfolio/hse-pulse/pulseflow:latest --region=europe-west1 --platform=managed --allow-unauthenticated --min-instances=0 --max-instances=2 --memory=512Mi --cpu=1 --port=8000 --timeout=300

# MediSync (Multi-agent RL)
gcloud run deploy medisync --image=europe-west1-docker.pkg.dev/hse-pulse-portfolio/hse-pulse/medisync:latest --region=europe-west1 --platform=managed --allow-unauthenticated --min-instances=0 --max-instances=2 --memory=1Gi --cpu=1 --port=8000 --timeout=300
```

---

## Verify Deployment

```bash
# List all services
gcloud run services list --region=europe-west1

# Check landing page
$LANDING_URL = gcloud run services describe landing --region=europe-west1 --format="value(status.url)"
echo "Portfolio URL: $LANDING_URL"

# Test orchestrator
curl "$ORCHESTRATOR_URL?service=careplanplus"
```

---

## Expected Output

After deployment:
```
Portfolio URL: https://landing-xxxxx-ew.a.run.app

Services deployed:
  - landing (min=1, always on)
  - careplanplus (min=0, scale to zero)
  - pulsenotes (min=0, scale to zero)
  - pulseflow (min=0, scale to zero)
  - medisync (min=0, scale to zero)

Estimated monthly cost: ~$7-10
```

---

## Cost Monitoring

```bash
# Set budget alert
gcloud billing budgets create --billing-account=YOUR_BILLING_ACCOUNT --display-name="HSE-Pulse Budget" --budget-amount=15USD --threshold-rule=percent=80

# View current costs
# https://console.cloud.google.com/billing
```

---

## Cleanup (if needed)

```bash
# Delete all services
gcloud run services delete landing --region=europe-west1 --quiet
gcloud run services delete careplanplus --region=europe-west1 --quiet
gcloud run services delete pulsenotes --region=europe-west1 --quiet
gcloud run services delete pulseflow --region=europe-west1 --quiet
gcloud run services delete medisync --region=europe-west1 --quiet

# Delete functions
gcloud functions delete demo-orchestrator --region=europe-west1 --quiet
gcloud functions delete check-status --region=europe-west1 --quiet

# Delete project (removes everything)
gcloud projects delete hse-pulse-portfolio
```

---

## Troubleshooting

### "Permission denied" errors
```bash
gcloud auth login
gcloud config set project hse-pulse-portfolio
```

### "Billing not enabled" error
Visit https://console.cloud.google.com/billing and link a billing account

### Docker push fails
```bash
gcloud auth configure-docker europe-west1-docker.pkg.dev
```

### Service won't start
```bash
gcloud run services logs read <service-name> --region=europe-west1
```
