# HSE-Pulse Kubernetes Deployment

This directory contains Kubernetes manifests and deployment scripts for HSE-Pulse.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Kubernetes Cluster                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    hse-pulse namespace                     │  │
│  │                                                            │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐          │  │
│  │  │ PulseFlow  │  │CarePlanPlus│  │ PulseNotes │          │  │
│  │  │  (LSTM)    │  │   (BERT)   │  │(ClinicalBERT)         │  │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘          │  │
│  │        │               │               │                  │  │
│  │  ┌─────┴───────────────┴───────────────┴──────┐          │  │
│  │  │              Ingress Controller             │          │  │
│  │  └─────────────────────┬───────────────────────┘          │  │
│  │                        │                                  │  │
│  │  ┌─────────────────────┼───────────────────────┐          │  │
│  │  │    Shared Services  │                       │          │  │
│  │  │  ┌────────┐  ┌──────┴───┐  ┌────────┐      │          │  │
│  │  │  │MongoDB │  │  MLflow  │  │Grafana │      │          │  │
│  │  │  └────────┘  └──────────┘  └────────┘      │          │  │
│  │  └────────────────────────────────────────────┘          │  │
│  │                                                            │  │
│  │  ┌────────────────────────────────────────────┐          │  │
│  │  │         GPU Training Jobs (on-demand)       │          │  │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │          │  │
│  │  │  │PulseFlow │  │CarePlan+ │  │ MediSync │  │          │  │
│  │  │  │ Trainer  │  │ Trainer  │  │ Trainer  │  │          │  │
│  │  │  └──────────┘  └──────────┘  └──────────┘  │          │  │
│  │  └────────────────────────────────────────────┘          │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
k8s/
├── base/                    # Base Kubernetes manifests
│   ├── namespace.yaml       # Namespace definition
│   ├── configmap.yaml       # Configuration data
│   ├── secrets.yaml         # Sensitive data (use sealed-secrets in prod)
│   ├── storage.yaml         # PersistentVolumeClaims
│   ├── mongodb.yaml         # MongoDB deployment
│   ├── services.yaml        # ML service deployments
│   └── ingress.yaml         # Ingress rules
├── overlays/
│   ├── dev/                 # Development overrides
│   └── prod/                # Production overrides
├── training/
│   └── gpu-training-job.yaml # GPU training job templates
└── gpu/
    └── nvidia-device-plugin.yaml # NVIDIA GPU support

helm/
└── hse-pulse/               # Helm chart for easy deployment
    ├── Chart.yaml
    ├── values.yaml
    └── templates/

scripts/k8s/
├── setup-minikube.sh        # Local development setup
├── deploy-gcp.sh            # GCP GKE deployment
├── deploy-aws.sh            # AWS EKS deployment
└── launch-training.sh       # On-demand training job launcher
```

## Quick Start

### Local Development (Minikube)

```bash
# Setup minikube with GPU support (optional)
./scripts/k8s/setup-minikube.sh

# Or without GPU
ENABLE_GPU=false ./scripts/k8s/setup-minikube.sh
```

### GCP (Google Kubernetes Engine)

```bash
# Set your GCP project
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="europe-west1"

# Deploy
./scripts/k8s/deploy-gcp.sh
```

### AWS (Elastic Kubernetes Service)

```bash
# Set your AWS region
export AWS_REGION="eu-west-1"

# Deploy
./scripts/k8s/deploy-aws.sh
```

## GPU Training

### Launch Training Jobs On-Demand

```bash
# Train PulseFlow LSTM model
./scripts/k8s/launch-training.sh pulseflow 100 64

# Train CarePlanPlus BERT model
./scripts/k8s/launch-training.sh careplanplus 10 16

# Train MediSync RL model
./scripts/k8s/launch-training.sh medisync 10000 256

# List running training jobs
./scripts/k8s/launch-training.sh list
```

### Monitor Training

```bash
# Watch training logs
kubectl logs -f job/pulseflow-training-20240115-123456 -n hse-pulse

# Check job status
kubectl get jobs -n hse-pulse -l component=training

# View MLflow experiments
kubectl port-forward svc/mlflow-service 5000:5000 -n hse-pulse
# Open http://localhost:5000
```

## Model Serving

Models are served from persistent storage. After training completes:

1. Models are saved to the shared `models-pvc` PersistentVolumeClaim
2. Model serving pods automatically pick up new models on restart
3. Use rolling updates for zero-downtime deployments

```bash
# Restart a service to load new model
kubectl rollout restart deployment/pulseflow -n hse-pulse

# Watch rollout status
kubectl rollout status deployment/pulseflow -n hse-pulse
```

## Cloud Provider Compatibility

### Storage Classes

| Provider | Storage Class | Notes |
|----------|--------------|-------|
| Minikube | standard | Local provisioner |
| GCP GKE | standard | Persistent Disk |
| AWS EKS | gp2 | EBS volumes |
| Azure AKS | default | Azure Disk |

### GPU Support

| Provider | GPU Type | Node Selector |
|----------|----------|---------------|
| GCP | nvidia-tesla-t4 | `cloud.google.com/gke-accelerator: nvidia-tesla-t4` |
| AWS | p3.2xlarge (V100) | `node.kubernetes.io/instance-type: p3.2xlarge` |
| Azure | Standard_NC6s_v3 | `accelerator: nvidia` |

## Helm Deployment

```bash
# Add dependencies
helm dependency update ./helm/hse-pulse

# Install
helm install hse-pulse ./helm/hse-pulse \
  --namespace hse-pulse \
  --create-namespace

# Upgrade
helm upgrade hse-pulse ./helm/hse-pulse \
  --namespace hse-pulse

# Uninstall
helm uninstall hse-pulse -n hse-pulse
```

### Custom Values

```bash
# Deploy with custom values
helm install hse-pulse ./helm/hse-pulse \
  --namespace hse-pulse \
  --set pulseflow.replicaCount=3 \
  --set training.gpu.enabled=true \
  --set ingress.enabled=true
```

## Monitoring

### Prometheus Metrics

All services expose metrics at `/metrics`:
- `http_requests_total` - Request count by method/endpoint/status
- `http_request_duration_seconds` - Request latency histogram
- `model_inference_duration_seconds` - Model inference time
- `predictions_total` - Total predictions made

### Grafana Dashboards

Access Grafana:
```bash
kubectl port-forward svc/grafana-service 3000:3000 -n hse-pulse
# Open http://localhost:3000 (admin/admin)
```

## Troubleshooting

### Check Pod Status
```bash
kubectl get pods -n hse-pulse
kubectl describe pod <pod-name> -n hse-pulse
```

### View Logs
```bash
kubectl logs -f deployment/pulseflow -n hse-pulse
```

### Check GPU Nodes
```bash
kubectl get nodes -l accelerator=nvidia-gpu
kubectl describe node <gpu-node-name>
```

### Debug Network Issues
```bash
kubectl run debug --rm -it --image=nicolaka/netshoot -n hse-pulse -- /bin/bash
```
