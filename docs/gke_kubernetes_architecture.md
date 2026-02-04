# GKE Kubernetes Architecture for HSE-Pulse Portfolio

## Architecture Overview

```
                    harishankar.info
                          │
                    Cloud DNS Zone
                          │
                    GKE Ingress (HTTPS)
                          │
            ┌─────────────┼─────────────┐
            │             │             │
     landing.           demo.         demo.
   harishankar.info   harishankar.info/medisync
                                      /pulseflow
            │             │
   ┌────────┴────┐   ┌────┴────┐
   │  Landing    │   │  Demo   │
   │  Pod (1)    │   │  Pods   │
   │  Always On  │   │  (0→N)  │
   └─────────────┘   └─────────┘
```

## Components

### 1. GKE Cluster (Autopilot Mode)
- **Why Autopilot**: Pay only for pods running, automatic scaling, managed nodes
- **Region**: europe-west1 (closest to target users)
- No node management overhead

### 2. Deployments

#### Landing Page (Always On)
- 1 replica minimum
- Resources: 256Mi RAM, 0.25 vCPU
- Cost: ~$5-8/month

#### Demo Services (Scale to Zero)
- Use **KEDA** (Kubernetes Event-Driven Autoscaling)
- Scale from 0 replicas when not in use
- Scale up when HTTP requests arrive
- Scale down after 5-10 minutes of inactivity

| Service | Memory | CPU | Estimated On-Demand Cost |
|---------|--------|-----|--------------------------|
| MediSync | 2Gi | 2 | $0.12/hour when running |
| PulseFlow | 1Gi | 1 | $0.06/hour when running |
| CarePlanPlus | 2Gi | 2 | $0.12/hour when running |
| PulseNotes | 1Gi | 1 | $0.06/hour when running |

### 3. DNS Configuration (harishankar.info)

**Option A: Use Cloud DNS (Recommended)**
- Create Cloud DNS zone for harishankar.info
- Update Bigrock nameservers to point to Google Cloud DNS
- Full control over DNS records

**Option B: Keep Bigrock DNS**
- Add A record pointing to GKE Ingress IP
- Add CNAME for subdomains

### 4. Ingress & SSL
- GKE Ingress with Google-managed SSL certificates
- Automatic HTTPS with Let's Encrypt
- Path-based routing to services

## Cost Estimate

### Fixed Monthly Costs
| Component | Cost/Month |
|-----------|------------|
| GKE Autopilot Management Fee | $0 (free for first cluster) |
| Cloud DNS Zone | $0.20 |
| SSL Certificate | Free (Google-managed) |
| Regional Load Balancer | ~$18 |
| **Subtotal Fixed** | **~$18.20/month** |

### Variable Costs (Pod Runtime)

#### Landing Page (24/7)
- 256Mi RAM, 0.25 vCPU
- ~720 hours/month
- Cost: ~$5-8/month

#### Demo Pods (On-Demand)
Assuming demos run ~2 hours/day average:
- MediSync (2Gi/2vCPU): ~$7/month
- PulseFlow (1Gi/1vCPU): ~$3.50/month
- CarePlanPlus (2Gi/2vCPU): ~$7/month
- PulseNotes (1Gi/1vCPU): ~$3.50/month

### Total Estimated Cost

| Usage Scenario | Monthly Cost |
|----------------|--------------|
| Minimal (landing only) | ~$23-26/month |
| Light demo usage (1hr/day) | ~$30-35/month |
| Moderate demo usage (2hr/day) | ~$40-45/month |
| Heavy demo usage (4hr/day) | ~$55-65/month |

## Comparison with Current Cloud Run Setup

| Aspect | Cloud Run | GKE Autopilot |
|--------|-----------|---------------|
| Base Cost | ~$0 (scale to zero) | ~$18 (load balancer) |
| Landing Page | ~$2-5/month | ~$5-8/month |
| Demo Services | Pay per request | Pay per pod-hour |
| Cold Start | 5-30 seconds | 30-60 seconds (KEDA) |
| Complexity | Simple | More complex |
| Control | Limited | Full Kubernetes |

**Recommendation**: For a portfolio demo, **Cloud Run is more cost-effective**. GKE makes sense if you need:
- Custom networking
- Persistent connections (WebSockets long-running)
- GPU workloads
- Multi-container pods

## Implementation Steps

### Phase 1: Decommission Cloud Run
```bash
# Delete Cloud Run services
gcloud run services delete landing --region=europe-west1 --quiet
gcloud run services delete medisync --region=europe-west1 --quiet
gcloud run services delete pulseflow --region=europe-west1 --quiet
```

### Phase 2: Create GKE Cluster
```bash
# Create Autopilot cluster
gcloud container clusters create-auto hse-pulse-cluster \
    --region=europe-west1 \
    --project=hse-pulse-portfolio
```

### Phase 3: Configure DNS
```bash
# Create Cloud DNS zone
gcloud dns managed-zones create harishankar-zone \
    --dns-name="harishankar.info." \
    --description="HSE Pulse Portfolio DNS"

# Get nameservers (update at Bigrock)
gcloud dns managed-zones describe harishankar-zone --format="value(nameServers)"
```

### Phase 4: Deploy Services
- Deploy landing page with Deployment + Service
- Deploy demo services with KEDA ScaledObjects
- Configure Ingress with SSL

### Phase 5: Configure KEDA for Scale-to-Zero
```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: medisync-scaler
spec:
  scaleTargetRef:
    name: medisync
  minReplicaCount: 0
  maxReplicaCount: 2
  cooldownPeriod: 300  # 5 minutes
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus:9090
        metricName: http_requests_total
        threshold: '1'
```

## Files to Create

1. `infrastructure/k8s/cluster-setup.sh` - Cluster creation script
2. `infrastructure/k8s/namespaces.yaml` - Kubernetes namespaces
3. `infrastructure/k8s/landing/` - Landing page manifests
4. `infrastructure/k8s/medisync/` - MediSync manifests
5. `infrastructure/k8s/pulseflow/` - PulseFlow manifests
6. `infrastructure/k8s/ingress.yaml` - Ingress configuration
7. `infrastructure/k8s/keda/` - KEDA scalers
8. `infrastructure/dns/cloud-dns-setup.sh` - DNS configuration
