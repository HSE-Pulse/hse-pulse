# Cloud Deployment Requirements - HSE-Pulse

## Overview

This document outlines the system requirements and estimated costs for deploying HSE-Pulse across multiple cloud providers. HSE-Pulse consists of 17 containerised microservices including 4 ML services.

**Minimum Requirements:** 4 vCPU, 8 GB RAM, 80 GB SSD

---

## Current Resource Usage

| Service | Memory | Description |
|---------|--------|-------------|
| CarePlanPlus | ~1,000 MB | BERT-based treatment recommendation |
| MediSync (DES-MARL) | ~300 MB | Multi-agent RL hospital optimisation |
| PulseNotes | ~270 MB | ClinicalBERT RAG pipeline |
| MLflow | ~270 MB | ML experiment tracking |
| MongoDB | ~160 MB | Document database |
| Grafana | ~140 MB | Monitoring dashboards |
| MinIO | ~95 MB | Object storage (S3-compatible) |
| PulseFlow | ~70 MB | LSTM trolley forecasting |
| Prometheus | ~70 MB | Metrics collection |
| Other services | ~150 MB | Nginx, Redis, UIs |
| **Total** | **~2.5 GB** | Base memory (8 GB recommended with headroom) |

---

## Cost Comparison - Demo Deployment

### Most Cost-Effective Options (Ranked)

| Rank | Provider | Instance | vCPU | RAM | Storage | Monthly Cost |
|------|----------|----------|------|-----|---------|--------------|
| 1 | **Oracle Cloud** | VM.Standard.A1.Flex | 4 | 24 GB | 200 GB | **FREE** |
| 2 | **Hetzner** | CPX31 | 4 | 8 GB | 160 GB | **~$15** |
| 3 | **Vultr** | High Frequency | 4 | 8 GB | 128 GB | **~$24** |
| 4 | **DigitalOcean** | Premium (AMD) | 4 | 8 GB | 100 GB | **~$28** |
| 5 | **Linode** | Dedicated 8GB | 4 | 8 GB | 160 GB | **~$36** |
| 6 | **AWS** | t3.xlarge (Spot) | 4 | 16 GB | 100 GB | **~$40** |
| 7 | **GCP** | e2-standard-4 (Spot) | 4 | 16 GB | 100 GB | **~$45** |
| 8 | **Azure** | B4ms (Spot) | 4 | 16 GB | 100 GB | **~$48** |

---

## Recommended: Oracle Cloud Free Tier

**Best for:** Portfolio demos, always-on availability, zero cost

Oracle Cloud offers the most generous free tier with ARM-based Ampere instances.

| Specification | Value |
|---------------|-------|
| Instance | VM.Standard.A1.Flex |
| vCPUs | 4 (up to 4 free) |
| Memory | 24 GB (up to 24 GB free) |
| Storage | 200 GB boot volume (free) |
| Bandwidth | 10 TB/month (free) |
| **Monthly Cost** | **$0** |

### Oracle Cloud Deploy Commands
```bash
# Install OCI CLI
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"

# Create instance (via Console or Terraform recommended for free tier)
# Use ARM-compatible Docker images or build for arm64

# SSH and deploy
ssh -i ~/.ssh/oci_key ubuntu@<PUBLIC_IP>

# Install Docker (ARM64)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Clone and deploy
git clone https://github.com/HSE-Pulse/hse-pulse.git
cd hse-pulse
docker-compose up -d
```

**Note:** Requires ARM64-compatible images. Most HSE-Pulse services support multi-arch.

---

## Budget Option: Hetzner Cloud

**Best for:** European hosting, excellent price-performance, reliable

| Specification | Value |
|---------------|-------|
| Instance | CPX31 |
| vCPUs | 4 (AMD EPYC) |
| Memory | 8 GB |
| Storage | 160 GB NVMe SSD |
| Bandwidth | 20 TB/month |
| Location | Germany, Finland, USA |
| **Monthly Cost** | **~$15 (~EUR 13.99)** |

### Hetzner Deploy Commands
```bash
# Install hcloud CLI
brew install hcloud  # macOS
# or download from https://github.com/hetznercloud/cli

# Create server
hcloud server create \
  --name hse-pulse \
  --type cpx31 \
  --image ubuntu-22.04 \
  --location nbg1 \
  --ssh-key your-key

# SSH and deploy
ssh root@<IP_ADDRESS>

# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone and deploy
git clone https://github.com/HSE-Pulse/hse-pulse.git
cd hse-pulse
docker-compose up -d
```

---

## Alternative Budget Options

### Vultr High Frequency (~$24/month)

| Specification | Value |
|---------------|-------|
| Instance | High Frequency |
| vCPUs | 4 |
| Memory | 8 GB |
| Storage | 128 GB NVMe |
| Bandwidth | 4 TB/month |

```bash
# Deploy via Vultr CLI or Console
vultr-cli instance create \
  --region ams \
  --plan vc2-4c-8gb-intel-hf \
  --os 387 \
  --label hse-pulse
```

### DigitalOcean Premium (~$28/month)

| Specification | Value |
|---------------|-------|
| Instance | Premium AMD |
| vCPUs | 4 |
| Memory | 8 GB |
| Storage | 100 GB NVMe |
| Bandwidth | 5 TB/month |

```bash
# Deploy via doctl
doctl compute droplet create hse-pulse \
  --region ams3 \
  --size s-4vcpu-8gb-amd \
  --image ubuntu-22-04-x64
```

---

## Major Cloud Providers

### AWS - Most Cost-Effective Demo

| Option | Instance | vCPU | RAM | Monthly Cost |
|--------|----------|------|-----|--------------|
| **Spot (Recommended)** | t3.xlarge | 4 | 16 GB | ~$40 |
| On-Demand | t3.xlarge | 4 | 16 GB | ~$120 |
| Reserved (1-yr) | t3.xlarge | 4 | 16 GB | ~$76 |

```bash
# Launch Spot Instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.xlarge \
  --instance-market-options '{"MarketType":"spot","SpotOptions":{"SpotInstanceType":"persistent"}}' \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":100,"VolumeType":"gp3"}}]' \
  --key-name your-key \
  --security-group-ids sg-xxxxx
```

### GCP - Most Cost-Effective Demo

| Option | Instance | vCPU | RAM | Monthly Cost |
|--------|----------|------|-----|--------------|
| **Spot (Recommended)** | e2-standard-4 | 4 | 16 GB | ~$45 |
| On-Demand | e2-standard-4 | 4 | 16 GB | ~$123 |
| Committed (1-yr) | e2-standard-4 | 4 | 16 GB | ~$85 |

```bash
# Create Spot (Preemptible) VM
gcloud compute instances create hse-pulse-vm \
  --machine-type=e2-standard-4 \
  --zone=europe-west1-b \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=100GB \
  --boot-disk-type=pd-ssd \
  --provisioning-model=SPOT \
  --instance-termination-action=STOP \
  --tags=http-server,https-server
```

### Azure - Most Cost-Effective Demo

| Option | Instance | vCPU | RAM | Monthly Cost |
|--------|----------|------|-----|--------------|
| **Spot (Recommended)** | B4ms | 4 | 16 GB | ~$48 |
| On-Demand | B4ms | 4 | 16 GB | ~$135 |
| Reserved (1-yr) | B4ms | 4 | 16 GB | ~$95 |

```bash
# Create Spot VM
az vm create \
  --resource-group hse-pulse-rg \
  --name hse-pulse-vm \
  --image Ubuntu2204 \
  --size Standard_B4ms \
  --priority Spot \
  --max-price -1 \
  --eviction-policy Deallocate \
  --admin-username azureuser \
  --generate-ssh-keys
```

---

## Cost Summary by Use Case

### Demo/Portfolio (Intermittent Use)

| Provider | Best Option | Monthly Cost | Notes |
|----------|-------------|--------------|-------|
| Oracle Cloud | Free Tier | **$0** | ARM64, always free |
| Hetzner | CPX31 | **$15** | x86, reliable |
| GCP | Spot e2-standard-4 | ~$45 | May be interrupted |

### Development (Daily Use)

| Provider | Best Option | Monthly Cost | Notes |
|----------|-------------|--------------|-------|
| Hetzner | CPX41 | **$24** | 8 vCPU, 16 GB |
| Vultr | High Frequency | **$48** | 8 vCPU, 16 GB |
| DigitalOcean | Premium | **$56** | 8 vCPU, 16 GB |

### Production (Always-On)

| Provider | Best Option | Monthly Cost | Notes |
|----------|-------------|--------------|-------|
| Hetzner | CCX33 | **$70** | Dedicated, 8 vCPU |
| AWS | Reserved t3.xlarge | ~$76 | 1-year commitment |
| GCP | Committed e2-standard-4 | ~$85 | 1-year commitment |

---

## Quick Comparison Chart

```
Monthly Cost (Demo - 4 vCPU, 8+ GB RAM)

$0   |████████████████████████████████████████| Oracle Free Tier
$15  |██████                                  | Hetzner CPX31
$24  |██████████                              | Vultr HF
$28  |████████████                            | DigitalOcean
$36  |███████████████                         | Linode
$40  |█████████████████                       | AWS Spot
$45  |██████████████████                      | GCP Spot
$48  |████████████████████                    | Azure Spot
$120 |██████████████████████████████████████████████████| AWS On-Demand
$123 |███████████████████████████████████████████████████| GCP On-Demand
$135 |████████████████████████████████████████████████████████| Azure On-Demand
```

---

## Deployment Prerequisites

### Software Requirements
```
Docker Engine >= 24.0
Docker Compose >= 2.20
Git >= 2.40
```

### Post-Deploy Setup (All Providers)
```bash
# SSH into instance
ssh user@<IP_ADDRESS>

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Clone repository
git clone https://github.com/HSE-Pulse/hse-pulse.git
cd hse-pulse

# Deploy
docker-compose up -d

# Verify
docker ps
curl http://localhost:8090/health
```

---

## Recommendations

| Scenario | Recommended Provider | Monthly Cost |
|----------|---------------------|--------------|
| **Portfolio Demo** | Oracle Cloud Free | $0 |
| **Interview Demo** | Hetzner CPX31 | $15 |
| **Development** | Hetzner CPX41 | $24 |
| **Production (EU)** | Hetzner CCX33 | $70 |
| **Production (Global)** | AWS/GCP Reserved | $76-85 |
| **Enterprise** | GKE/EKS | $300+ |

---

## Security Recommendations

- [ ] Configure firewall (allow only 80, 443, 22)
- [ ] Enable SSL/TLS with Let's Encrypt
- [ ] Use SSH keys only (disable password auth)
- [ ] Regular security updates
- [ ] Configure fail2ban for SSH protection
- [ ] Use secrets management for credentials

---

## Support

For deployment assistance or questions:
- GitHub: [github.com/HSE-Pulse](https://github.com/HSE-Pulse)

---

*Last Updated: February 2026*
