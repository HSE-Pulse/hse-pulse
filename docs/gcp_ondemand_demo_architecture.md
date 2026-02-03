# GCP On-Demand Demo Architecture

## Overview

This architecture runs a lightweight portfolio 24/7 on free tier, with ML demo clusters spinning up on-demand when visitors click project links.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VISITOR FLOW                                     │
└─────────────────────────────────────────────────────────────────────────┘

    Visitor arrives          Clicks "Live Demo"        Demo Ready
         │                         │                       │
         ▼                         ▼                       ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Landing Page  │ ───► │  Cloud Function │ ───► │   ML Service    │
│   (Always On)   │      │  (Spin-up API)  │      │  (On-Demand)    │
│   FREE TIER     │      │   $0.0000004    │      │  ~$0.01/hour    │
└─────────────────┘      └─────────────────┘      └─────────────────┘
     e2-micro               Cloud Functions          Cloud Run
     $0/month               Pay per invoke           Scale to zero
```

---

## Architecture Components

| Component | Service | Cost | Purpose |
|-----------|---------|------|---------|
| Landing Page | Cloud Run (min 1) | ~$5/month | Always-on portfolio |
| Spin-up API | Cloud Functions | ~$0.50/month | Orchestrate demos |
| CarePlanPlus | Cloud Run | ~$0/idle | BERT recommendations |
| PulseNotes | Cloud Run | ~$0/idle | RAG pipeline |
| PulseFlow | Cloud Run | ~$0/idle | LSTM forecasting |
| MediSync | Cloud Run | ~$0/idle | Multi-agent RL |
| MongoDB | Cloud Run | ~$0/idle | Shared database |
| Redis | Memorystore | ~$0/idle | Caching |

**Total Monthly Cost (Estimated):** ~$8-15/month with typical demo usage

---

## Predicted Costs

### Base Infrastructure (24/7)

| Resource | Specification | Monthly Cost |
|----------|---------------|--------------|
| Cloud Run (Landing) | 1 instance, 256MB | ~$5 |
| Cloud Functions | ~100 invocations | ~$0.01 |
| Artifact Registry | Container images | ~$1 |
| Cloud Storage | Static assets | ~$0.50 |
| **Base Total** | | **~$6.50/month** |

### Demo Usage Costs

| Service | Per Hour | 10 demos (1hr each) |
|---------|----------|---------------------|
| CarePlanPlus | $0.015 | $0.15 |
| PulseNotes | $0.012 | $0.12 |
| PulseFlow | $0.008 | $0.08 |
| MediSync | $0.010 | $0.10 |
| MongoDB | $0.005 | $0.05 |
| **Demo Total** | ~$0.05/hr | **~$0.50/month** |

### Total Monthly Projection

| Usage Level | Base | Demo Usage | Total |
|-------------|------|------------|-------|
| Light (5 demos) | $6.50 | $0.25 | **~$7/month** |
| Moderate (20 demos) | $6.50 | $1.00 | **~$8/month** |
| Heavy (50 demos) | $6.50 | $2.50 | **~$9/month** |

---

## Implementation Steps

### Step 1: Project Setup

```bash
# Set project
export PROJECT_ID="hse-pulse-portfolio"
export REGION="europe-west1"

# Create project
gcloud projects create $PROJECT_ID
gcloud config set project $PROJECT_ID

# Enable APIs
gcloud services enable \
  cloudfunctions.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

### Step 2: Create Artifact Registry

```bash
# Create container registry
gcloud artifacts repositories create hse-pulse \
  --repository-format=docker \
  --location=$REGION \
  --description="HSE-Pulse container images"
```

### Step 3: Build and Push Container Images

```bash
# Configure Docker auth
gcloud auth configure-docker $REGION-docker.pkg.dev

# Build and push each service
cd /path/to/hse-pulse

# Landing page
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/hse-pulse/landing:latest \
  ./services/landing
docker push $REGION-docker.pkg.dev/$PROJECT_ID/hse-pulse/landing:latest

# CarePlanPlus
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/hse-pulse/careplanplus:latest \
  ./services/careplanplus
docker push $REGION-docker.pkg.dev/$PROJECT_ID/hse-pulse/careplanplus:latest

# PulseNotes
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/hse-pulse/pulsenotes:latest \
  ./services/pulsenotes
docker push $REGION-docker.pkg.dev/$PROJECT_ID/hse-pulse/pulsenotes:latest

# PulseFlow
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/hse-pulse/pulseflow:latest \
  ./services/pulseflow
docker push $REGION-docker.pkg.dev/$PROJECT_ID/hse-pulse/pulseflow:latest

# MediSync
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/hse-pulse/medisync:latest \
  ./services/medisync
docker push $REGION-docker.pkg.dev/$PROJECT_ID/hse-pulse/medisync:latest
```

---

## Cloud Function: Demo Orchestrator

### Create Function Directory

```bash
mkdir -p infrastructure/cloud-functions/demo-orchestrator
cd infrastructure/cloud-functions/demo-orchestrator
```

### main.py

```python
import functions_framework
from google.cloud import run_v2
from flask import jsonify, request
import os
import time

PROJECT_ID = os.environ.get('PROJECT_ID', 'hse-pulse-portfolio')
REGION = os.environ.get('REGION', 'europe-west1')

# Service configurations
SERVICES = {
    'careplanplus': {
        'image': f'{REGION}-docker.pkg.dev/{PROJECT_ID}/hse-pulse/careplanplus:latest',
        'memory': '2Gi',
        'cpu': '2',
        'port': 8000,
        'timeout': 300,
        'min_instances': 0,
        'max_instances': 1,
    },
    'pulsenotes': {
        'image': f'{REGION}-docker.pkg.dev/{PROJECT_ID}/hse-pulse/pulsenotes:latest',
        'memory': '1Gi',
        'cpu': '1',
        'port': 8000,
        'timeout': 300,
        'min_instances': 0,
        'max_instances': 1,
    },
    'pulseflow': {
        'image': f'{REGION}-docker.pkg.dev/{PROJECT_ID}/hse-pulse/pulseflow:latest',
        'memory': '512Mi',
        'cpu': '1',
        'port': 8000,
        'timeout': 300,
        'min_instances': 0,
        'max_instances': 1,
    },
    'medisync': {
        'image': f'{REGION}-docker.pkg.dev/{PROJECT_ID}/hse-pulse/medisync:latest',
        'memory': '1Gi',
        'cpu': '1',
        'port': 8000,
        'timeout': 300,
        'min_instances': 0,
        'max_instances': 1,
    },
}


@functions_framework.http
def demo_orchestrator(request):
    """Handle demo spin-up requests."""

    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    if request.method == 'OPTIONS':
        return ('', 204, headers)

    # Get service name from request
    service_name = request.args.get('service') or request.json.get('service')

    if not service_name:
        return (jsonify({'error': 'Service name required'}), 400, headers)

    if service_name not in SERVICES:
        return (jsonify({'error': f'Unknown service: {service_name}'}), 404, headers)

    try:
        # Check if service is already running
        client = run_v2.ServicesClient()
        service_path = f'projects/{PROJECT_ID}/locations/{REGION}/services/{service_name}'

        try:
            service = client.get_service(name=service_path)
            service_url = service.uri

            # Service exists, check if it's ready
            if service.latest_ready_revision:
                return (jsonify({
                    'status': 'ready',
                    'service': service_name,
                    'url': service_url,
                    'message': 'Service is running'
                }), 200, headers)
        except Exception:
            # Service doesn't exist, need to deploy
            pass

        # Deploy the service
        service_config = SERVICES[service_name]

        service = run_v2.Service()
        service.template = run_v2.RevisionTemplate()
        service.template.containers = [run_v2.Container()]
        service.template.containers[0].image = service_config['image']
        service.template.containers[0].ports = [run_v2.ContainerPort(container_port=service_config['port'])]
        service.template.containers[0].resources = run_v2.ResourceRequirements(
            limits={'memory': service_config['memory'], 'cpu': service_config['cpu']}
        )
        service.template.scaling = run_v2.RevisionScaling(
            min_instance_count=service_config['min_instances'],
            max_instance_count=service_config['max_instances']
        )

        # Create or update service
        operation = client.create_service(
            parent=f'projects/{PROJECT_ID}/locations/{REGION}',
            service=service,
            service_id=service_name
        )

        # Wait for deployment
        result = operation.result(timeout=120)

        return (jsonify({
            'status': 'deploying',
            'service': service_name,
            'url': result.uri,
            'message': 'Service is starting up, please wait 30-60 seconds'
        }), 202, headers)

    except Exception as e:
        return (jsonify({
            'status': 'error',
            'service': service_name,
            'error': str(e)
        }), 500, headers)


@functions_framework.http
def check_status(request):
    """Check status of a demo service."""

    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    if request.method == 'OPTIONS':
        return ('', 204, headers)

    service_name = request.args.get('service')

    if not service_name:
        return (jsonify({'error': 'Service name required'}), 400, headers)

    try:
        client = run_v2.ServicesClient()
        service_path = f'projects/{PROJECT_ID}/locations/{REGION}/services/{service_name}'

        service = client.get_service(name=service_path)

        # Check health
        is_ready = service.latest_ready_revision is not None

        return (jsonify({
            'service': service_name,
            'status': 'ready' if is_ready else 'starting',
            'url': service.uri if is_ready else None,
        }), 200, headers)

    except Exception as e:
        return (jsonify({
            'service': service_name,
            'status': 'stopped',
            'url': None,
        }), 200, headers)
```

### requirements.txt

```
functions-framework==3.*
google-cloud-run==0.10.*
flask==3.*
```

### Deploy Cloud Function

```bash
# Deploy orchestrator function
gcloud functions deploy demo-orchestrator \
  --gen2 \
  --runtime=python311 \
  --region=$REGION \
  --source=. \
  --entry-point=demo_orchestrator \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars=PROJECT_ID=$PROJECT_ID,REGION=$REGION

# Deploy status check function
gcloud functions deploy check-status \
  --gen2 \
  --runtime=python311 \
  --region=$REGION \
  --source=. \
  --entry-point=check_status \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars=PROJECT_ID=$PROJECT_ID,REGION=$REGION

# Get function URLs
gcloud functions describe demo-orchestrator --region=$REGION --format='value(url)'
gcloud functions describe check-status --region=$REGION --format='value(url)'
```

---

## Landing Page Integration

### Update Projects.tsx

Add demo launching functionality to the projects section:

```typescript
// services/landing/src/hooks/useDemoLauncher.ts

import { useState, useCallback } from 'react';

const ORCHESTRATOR_URL = import.meta.env.VITE_ORCHESTRATOR_URL ||
  'https://europe-west1-hse-pulse-portfolio.cloudfunctions.net/demo-orchestrator';
const STATUS_URL = import.meta.env.VITE_STATUS_URL ||
  'https://europe-west1-hse-pulse-portfolio.cloudfunctions.net/check-status';

interface DemoStatus {
  status: 'idle' | 'starting' | 'ready' | 'error';
  url?: string;
  message?: string;
}

export function useDemoLauncher() {
  const [demoStatus, setDemoStatus] = useState<Record<string, DemoStatus>>({});

  const launchDemo = useCallback(async (serviceName: string) => {
    setDemoStatus(prev => ({
      ...prev,
      [serviceName]: { status: 'starting', message: 'Spinning up demo...' }
    }));

    try {
      // Request spin-up
      const response = await fetch(`${ORCHESTRATOR_URL}?service=${serviceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.status === 'ready') {
        setDemoStatus(prev => ({
          ...prev,
          [serviceName]: { status: 'ready', url: data.url }
        }));
        window.open(data.url, '_blank');
        return;
      }

      // Poll for readiness
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`${STATUS_URL}?service=${serviceName}`);
          const statusData = await statusRes.json();

          if (statusData.status === 'ready') {
            clearInterval(pollInterval);
            setDemoStatus(prev => ({
              ...prev,
              [serviceName]: { status: 'ready', url: statusData.url }
            }));
            window.open(statusData.url, '_blank');
          }
        } catch (e) {
          console.error('Status check failed:', e);
        }
      }, 5000);

      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setDemoStatus(prev => ({
          ...prev,
          [serviceName]: {
            status: 'error',
            message: 'Timeout - please try again'
          }
        }));
      }, 120000);

    } catch (error) {
      setDemoStatus(prev => ({
        ...prev,
        [serviceName]: {
          status: 'error',
          message: 'Failed to start demo'
        }
      }));
    }
  }, []);

  return { demoStatus, launchDemo };
}
```

### Demo Button Component

```typescript
// services/landing/src/components/DemoButton.tsx

import { Loader2, Play, ExternalLink } from 'lucide-react';
import { useDemoLauncher } from '../hooks/useDemoLauncher';

interface DemoButtonProps {
  serviceName: string;
  label?: string;
}

export function DemoButton({ serviceName, label = 'Live Demo' }: DemoButtonProps) {
  const { demoStatus, launchDemo } = useDemoLauncher();
  const status = demoStatus[serviceName];

  const handleClick = () => {
    if (status?.status === 'ready' && status.url) {
      window.open(status.url, '_blank');
    } else if (status?.status !== 'starting') {
      launchDemo(serviceName);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={status?.status === 'starting'}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-lg
        text-sm font-medium transition-all
        ${status?.status === 'starting'
          ? 'bg-yellow-500/20 text-yellow-400 cursor-wait'
          : status?.status === 'ready'
          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
          : 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30'
        }
      `}
    >
      {status?.status === 'starting' ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Starting...
        </>
      ) : status?.status === 'ready' ? (
        <>
          <ExternalLink className="w-4 h-4" />
          Open Demo
        </>
      ) : (
        <>
          <Play className="w-4 h-4" />
          {label}
        </>
      )}
    </button>
  );
}
```

### Update Project Cards

```typescript
// In Projects.tsx, add DemoButton to each project card

import { DemoButton } from '../components/DemoButton';

// In the project card JSX:
<div className="flex gap-2 mt-4">
  <DemoButton serviceName="careplanplus" label="Try Demo" />
  <a href="#" className="...">View Code</a>
</div>
```

---

## Deploy Landing Page to Cloud Run

```bash
# Build landing page
cd services/landing
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/hse-pulse/landing:latest .
docker push $REGION-docker.pkg.dev/$PROJECT_ID/hse-pulse/landing:latest

# Deploy to Cloud Run (always-on)
gcloud run deploy landing \
  --image=$REGION-docker.pkg.dev/$PROJECT_ID/hse-pulse/landing:latest \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=1 \
  --max-instances=2 \
  --memory=256Mi \
  --cpu=1 \
  --port=80 \
  --set-env-vars="VITE_ORCHESTRATOR_URL=https://$REGION-$PROJECT_ID.cloudfunctions.net/demo-orchestrator"

# Get URL
gcloud run services describe landing --region=$REGION --format='value(status.url)'
```

---

## Custom Domain Setup

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service=landing \
  --domain=portfolio.yourdomain.com \
  --region=$REGION

# Get DNS records to configure
gcloud run domain-mappings describe \
  --domain=portfolio.yourdomain.com \
  --region=$REGION
```

---

## Auto-Shutdown (Scale to Zero)

Cloud Run automatically scales to zero after idle timeout. Configure per service:

```bash
# Set scale-to-zero timeout (default 15 minutes)
gcloud run services update careplanplus \
  --region=$REGION \
  --min-instances=0 \
  --timeout=300
```

---

## Monitoring & Alerts

### Set Up Budget Alert

```bash
# Create budget alert at $15/month
gcloud billing budgets create \
  --billing-account=YOUR_BILLING_ACCOUNT \
  --display-name="HSE-Pulse Portfolio Budget" \
  --budget-amount=15USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

### View Costs

```bash
# Check current month costs
gcloud billing accounts get-iam-policy YOUR_BILLING_ACCOUNT
```

---

## Complete Cost Summary

### Monthly Breakdown

| Component | Always-On | Per Demo | Est. Monthly |
|-----------|-----------|----------|--------------|
| Landing (Cloud Run) | $5 | - | $5.00 |
| Cloud Functions | - | $0.0000004 | $0.01 |
| Artifact Registry | $1 | - | $1.00 |
| CarePlanPlus (10 demos) | - | $0.02 | $0.20 |
| PulseNotes (10 demos) | - | $0.015 | $0.15 |
| PulseFlow (10 demos) | - | $0.01 | $0.10 |
| MediSync (10 demos) | - | $0.012 | $0.12 |
| **Total** | | | **~$6.58** |

### Annual Projection

| Usage | Monthly | Annual |
|-------|---------|--------|
| Light | ~$7 | **$84** |
| Moderate | ~$10 | **$120** |
| Heavy | ~$15 | **$180** |

---

## Quick Reference

| Action | Command |
|--------|---------|
| Deploy landing | `gcloud run deploy landing ...` |
| Deploy function | `gcloud functions deploy demo-orchestrator ...` |
| Check logs | `gcloud run services logs read landing` |
| View costs | GCP Console → Billing |
| Scale service | `gcloud run services update <svc> --min-instances=0` |

---

*Last Updated: February 2026*
