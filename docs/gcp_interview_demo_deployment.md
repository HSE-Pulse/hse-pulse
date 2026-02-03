# GCP Interview Demo Deployment Guide

## Overview

This guide provides step-by-step instructions to deploy HSE-Pulse on GCP for interview demonstrations with cost-effective settings. Includes on-demand spin-up/spin-down to minimize costs.

---

## Cost Strategy

| Component | Strategy | Savings |
|-----------|----------|---------|
| Compute | Spot VM (Preemptible) | 60-91% off |
| Storage | Standard persistent disk | 50% vs SSD |
| IP Address | Ephemeral (no static IP) | $3/month |
| Region | us-central1 (cheapest) | 10-20% vs EU |

---

## Predicted Monthly Costs

### Scenario 1: Always-On Portfolio (24/7)

| Resource | Specification | Monthly Cost |
|----------|---------------|--------------|
| e2-medium VM | 2 vCPU, 4 GB (landing only) | $24 |
| 20 GB Standard Disk | Boot volume | $0.80 |
| Egress (10 GB) | Outbound traffic | $1.20 |
| **Total** | | **~$26/month** |

### Scenario 2: On-Demand Full Demo (Interview Days Only)

**Assumption:** 10 interview demos per month, 4 hours each = 40 hours/month

| Resource | Specification | Monthly Cost |
|----------|---------------|--------------|
| e2-standard-4 Spot | 4 vCPU, 16 GB @ $0.04/hr | $1.60 |
| 100 GB Standard Disk | Persistent (kept) | $4.00 |
| Egress (20 GB) | Demo traffic | $2.40 |
| **Total** | | **~$8/month** |

### Scenario 3: Hybrid (Portfolio 24/7 + On-Demand Demo)

| Resource | Specification | Monthly Cost |
|----------|---------------|--------------|
| e2-micro (free tier) | Landing page only | $0 |
| e2-standard-4 Spot | Full demo (40 hrs) | $1.60 |
| 100 GB Standard Disk | Shared storage | $4.00 |
| Egress (30 GB) | Combined traffic | $3.60 |
| **Total** | | **~$9/month** |

---

## Architecture Options

### Option A: Single VM (Simplest)
```
┌─────────────────────────────────────┐
│         e2-standard-4 Spot          │
│  ┌─────────────────────────────┐    │
│  │   Docker Compose (17 svcs)  │    │
│  └─────────────────────────────┘    │
│         100 GB Standard Disk        │
└─────────────────────────────────────┘
         ↓ Spin up on demand
    Cost: ~$0.04/hour when running
```

### Option B: Split Architecture (Recommended)
```
┌──────────────────┐    ┌──────────────────────────┐
│  e2-micro (Free) │    │   e2-standard-4 Spot     │
│  Landing Page    │    │   Full ML Demo           │
│  Always On       │    │   On-Demand Only         │
│  $0/month        │    │   ~$0.04/hour            │
└──────────────────┘    └──────────────────────────┘
```

---

## Step-by-Step Deployment

### Prerequisites

1. **GCP Account** with billing enabled
2. **gcloud CLI** installed
3. **GitHub repo** access

### Step 1: Initial GCP Setup

```bash
# Install gcloud CLI (if not installed)
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Authenticate
gcloud auth login

# Create new project
gcloud projects create hse-pulse-demo --name="HSE Pulse Demo"
gcloud config set project hse-pulse-demo

# Enable billing (required for Spot VMs)
# Visit: https://console.cloud.google.com/billing

# Enable required APIs
gcloud services enable compute.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### Step 2: Configure Firewall Rules

```bash
# Allow HTTP/HTTPS traffic
gcloud compute firewall-rules create allow-web \
  --allow=tcp:80,tcp:443,tcp:8090 \
  --target-tags=web-server \
  --description="Allow web traffic"

# Allow SSH (restricted to your IP for security)
gcloud compute firewall-rules create allow-ssh \
  --allow=tcp:22 \
  --source-ranges="YOUR_IP/32" \
  --target-tags=web-server \
  --description="Allow SSH from my IP"
```

### Step 3: Create Startup Script

```bash
# Create startup script
cat > startup-script.sh << 'EOF'
#!/bin/bash
set -e

# Install Docker
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker $USER
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Clone or update repository
if [ -d "/opt/hse-pulse" ]; then
    cd /opt/hse-pulse && git pull
else
    git clone https://github.com/HSE-Pulse/hse-pulse.git /opt/hse-pulse
fi

# Start services
cd /opt/hse-pulse
docker-compose pull
docker-compose up -d

# Log completion
echo "HSE-Pulse deployment completed at $(date)" >> /var/log/hse-pulse-deploy.log
EOF
```

### Step 4: Create Demo VM (On-Demand)

```bash
# Create Spot VM for full demo
gcloud compute instances create hse-pulse-demo \
  --machine-type=e2-standard-4 \
  --zone=us-central1-a \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=100GB \
  --boot-disk-type=pd-standard \
  --provisioning-model=SPOT \
  --instance-termination-action=STOP \
  --maintenance-policy=TERMINATE \
  --tags=web-server \
  --metadata-from-file=startup-script=startup-script.sh

# Get external IP
gcloud compute instances describe hse-pulse-demo \
  --zone=us-central1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

### Step 5: Verify Deployment

```bash
# SSH into VM
gcloud compute ssh hse-pulse-demo --zone=us-central1-a

# Check Docker status
sudo docker ps

# Check service health
curl http://localhost:8090/health

# View logs
sudo docker-compose -f /opt/hse-pulse/docker-compose.yml logs --tail=50
```

---

## On-Demand Spin-Up/Spin-Down Scripts

### Create Management Scripts

Save these scripts locally for quick demo management:

#### spin-up.sh
```bash
#!/bin/bash
# Spin up HSE-Pulse demo VM

PROJECT="hse-pulse-demo"
ZONE="us-central1-a"
INSTANCE="hse-pulse-demo"

echo "Starting HSE-Pulse demo VM..."
gcloud compute instances start $INSTANCE --zone=$ZONE --project=$PROJECT

echo "Waiting for VM to be ready..."
sleep 30

# Get IP address
IP=$(gcloud compute instances describe $INSTANCE \
  --zone=$ZONE \
  --project=$PROJECT \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo "Waiting for services to start..."
sleep 60

echo "============================================"
echo "HSE-Pulse Demo is ready!"
echo "URL: http://$IP:8090"
echo "============================================"
echo ""
echo "Services:"
echo "  - Landing Page:  http://$IP:8090/"
echo "  - CarePlanPlus:  http://$IP:8090/careplanplus/"
echo "  - PulseNotes:    http://$IP:8090/pulsenotes/"
echo "  - PulseFlow:     http://$IP:8090/pulseflow/"
echo "  - MediSync:      http://$IP:8090/medisync/"
echo "  - Grafana:       http://$IP:8090/grafana/"
echo ""
echo "Cost: ~$0.04/hour while running"
```

#### spin-down.sh
```bash
#!/bin/bash
# Spin down HSE-Pulse demo VM

PROJECT="hse-pulse-demo"
ZONE="us-central1-a"
INSTANCE="hse-pulse-demo"

echo "Stopping HSE-Pulse demo VM..."
gcloud compute instances stop $INSTANCE --zone=$ZONE --project=$PROJECT

echo "============================================"
echo "HSE-Pulse Demo VM stopped"
echo "Storage cost: ~$4/month (disk preserved)"
echo "No compute charges while stopped"
echo "============================================"
```

#### check-status.sh
```bash
#!/bin/bash
# Check HSE-Pulse demo status

PROJECT="hse-pulse-demo"
ZONE="us-central1-a"
INSTANCE="hse-pulse-demo"

STATUS=$(gcloud compute instances describe $INSTANCE \
  --zone=$ZONE \
  --project=$PROJECT \
  --format='get(status)')

echo "VM Status: $STATUS"

if [ "$STATUS" == "RUNNING" ]; then
    IP=$(gcloud compute instances describe $INSTANCE \
      --zone=$ZONE \
      --project=$PROJECT \
      --format='get(networkInterfaces[0].accessConfigs[0].natIP)')
    echo "URL: http://$IP:8090"

    # Calculate running time
    START_TIME=$(gcloud compute instances describe $INSTANCE \
      --zone=$ZONE \
      --project=$PROJECT \
      --format='get(lastStartTimestamp)')
    echo "Started: $START_TIME"
fi
```

### Make Scripts Executable

```bash
chmod +x spin-up.sh spin-down.sh check-status.sh
```

---

## Interview Day Workflow

### Before Interview (15 mins prior)

```bash
# 1. Spin up the demo
./spin-up.sh

# 2. Verify services are running
./check-status.sh

# 3. Open browser tabs:
#    - Landing page (portfolio)
#    - CarePlanPlus (ML demo)
#    - Grafana (monitoring)
```

### During Interview

- Demo URL will be displayed by spin-up script
- All services accessible via single IP
- Show ML inference, dashboards, architecture

### After Interview

```bash
# Stop VM to save costs
./spin-down.sh
```

---

## Cost Calculator

### Hourly Costs (When Running)

| Resource | Hourly Cost |
|----------|-------------|
| e2-standard-4 Spot | $0.0402 |
| Network egress | ~$0.01 |
| **Total** | **~$0.05/hour** |

### Monthly Cost Scenarios

| Usage Pattern | Hours/Month | Compute | Storage | Total |
|---------------|-------------|---------|---------|-------|
| 5 demos (2hr each) | 10 hrs | $0.50 | $4.00 | **$4.50** |
| 10 demos (4hr each) | 40 hrs | $2.00 | $4.00 | **$6.00** |
| 20 demos (4hr each) | 80 hrs | $4.00 | $4.00 | **$8.00** |
| Always-on (Spot) | 730 hrs | $29.00 | $4.00 | **$33.00** |

### Annual Cost Projection

| Scenario | Monthly | Annual |
|----------|---------|--------|
| Light use (5 demos) | $4.50 | **$54** |
| Moderate (10 demos) | $6.00 | **$72** |
| Heavy (20 demos) | $8.00 | **$96** |
| Always-on Spot | $33.00 | **$396** |

---

## Alternative: Free Tier Landing + On-Demand Demo

### Deploy Landing Page on Free e2-micro

```bash
# Create always-free landing page VM
gcloud compute instances create hse-pulse-landing \
  --machine-type=e2-micro \
  --zone=us-central1-a \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB \
  --boot-disk-type=pd-standard \
  --tags=web-server

# Deploy only landing page
gcloud compute ssh hse-pulse-landing --zone=us-central1-a << 'EOF'
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
git clone https://github.com/HSE-Pulse/hse-pulse.git
cd hse-pulse
docker-compose up -d landing-ui nginx-proxy
EOF
```

**Cost:** $0/month (within free tier limits)

---

## Troubleshooting

### VM Won't Start (Spot Capacity)

```bash
# Try different zone
gcloud compute instances create hse-pulse-demo \
  --zone=us-central1-b \  # Changed zone
  # ... rest of options
```

### Services Not Starting

```bash
# SSH and check logs
gcloud compute ssh hse-pulse-demo --zone=us-central1-a
sudo docker-compose -f /opt/hse-pulse/docker-compose.yml logs
sudo docker-compose -f /opt/hse-pulse/docker-compose.yml restart
```

### Spot VM Preempted

```bash
# Spot VMs can be terminated with 30s notice
# Simply restart:
./spin-up.sh
```

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `./spin-up.sh` | Start demo VM |
| `./spin-down.sh` | Stop demo VM |
| `./check-status.sh` | Check VM status |
| `gcloud compute ssh hse-pulse-demo --zone=us-central1-a` | SSH into VM |

### Demo URLs (replace IP)

| Service | URL |
|---------|-----|
| Portfolio | `http://<IP>:8090/` |
| CarePlanPlus | `http://<IP>:8090/careplanplus/` |
| PulseNotes | `http://<IP>:8090/pulsenotes/` |
| PulseFlow | `http://<IP>:8090/pulseflow/` |
| MediSync | `http://<IP>:8090/medisync/` |
| Grafana | `http://<IP>:8090/grafana/` |
| MLflow | `http://<IP>:8090/mlflow/` |

---

## Summary

| Metric | Value |
|--------|-------|
| Setup Time | ~30 minutes (one-time) |
| Spin-up Time | ~2 minutes |
| Spin-down Time | ~30 seconds |
| Cost per Demo | ~$0.20 (4-hour session) |
| Monthly Cost | ~$6-8 (typical use) |
| Annual Cost | ~$72-96 |

---

*Last Updated: February 2026*
