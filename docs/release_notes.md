# Release Notes - Healthcare ML Portfolio v1.0.0

## Overview

This release provides an integrated portfolio of four healthcare ML/AI projects, containerized and ready for deployment.

## Projects Included

| Project | Description | Model Type | Demo UX |
|---------|-------------|------------|---------|
| PulseFlow | Patient flow prediction | LSTM | Interactive |
| CarePlanPlus | Treatment pathway recommender | BERT | Interactive |
| PulseNotes | Clinical NLP | Bio_ClinicalBERT + FAISS | Sample-based |
| MediSync | RL resource allocation | MADDPG + MAPPO | Sample-based |

## Configuration Summary

Based on user inputs during setup:

- **Docker Registry**: Docker Hub (`harishankarsomasundaram`)
- **Hosting**: Self-hosted GCP VM
- **Data Source**: MongoDB (local) with MIMIC, HSE, recommender_system databases
- **Demo UX**: Hybrid (interactive for PulseFlow/CarePlanPlus, samples for PulseNotes/MediSync)
- **CI/CD**: Auto-deploy on merge to main
- **Compute**:
  - Local: 12 CPUs, 32GB RAM, RTX 4060 (8GB VRAM)
  - VM: CPU-only inference (default)

## Assumptions Made

1. **Models**: Services start in "demo mode" if no trained model files are present. Demo mode uses synthetic predictions suitable for demonstration.

2. **MongoDB**: Connection string `mongodb://localhost:27017/` assumed. Services gracefully degrade if MongoDB unavailable.

3. **PulseFlow LSTM**: Based on existing implementation at `D:\DBS\HSE\predict_strain\views.py`. Uses 7-day sequence length, 5 input features.

4. **CarePlanPlus BERT**: Based on existing implementation at `D:\project-demo\care-plan-plus\pathway_recommender.py`. Uses bert-base-uncased with 6 frozen layers.

5. **GCP VM**: Assumes e2-standard-4 (4 vCPU, 16GB RAM) for production. Adjust docker-compose.prod.yml resource limits if using different instance type.

## Manual Steps Required

### Before First Deployment

1. **Set GitHub Secrets**:
   - `DOCKER_PASSWORD`: Docker Hub access token
   - `GCP_SSH_PRIVATE_KEY`: SSH key for VM access
   - `GCP_VM_HOST`: VM IP address or hostname
   - `GCP_VM_USER`: SSH username (default: deploy)

2. **Configure .env.prod on VM**:
   ```bash
   cp env.example .env.prod
   # Edit with production values:
   # - MONGO_URI (if external MongoDB)
   # - MINIO_ROOT_PASSWORD (strong password)
   # - GF_SECURITY_ADMIN_PASSWORD (Grafana)
   # - DOMAIN (your domain name)
   ```

3. **Provision Trained Models**:
   - Copy model files to `./models/<service>/` on VM
   - Or run training scripts to generate models
   - Services will work in demo mode without real models

### For SSL/HTTPS

```bash
./infrastructure/gcp/setup-ssl.sh your-domain.com your-email@example.com
```

### Training Scripts

Each service includes a training script:
```bash
# PulseFlow
python services/pulseflow/train.py --mongo-uri mongodb://localhost:27017/ --db-name HSE

# CarePlanPlus
python services/careplanplus/train.py --mongo-uri mongodb://localhost:27017/ --db-name recommender_system
```

## Directory Structure

```
portfolio-ml-health/
├── .github/workflows/     # CI/CD pipelines
├── demo-ui/               # Static demo website
├── docs/                  # Documentation
├── infrastructure/        # GCP setup scripts
├── monitoring/            # Prometheus + Grafana
├── proxy/                 # Nginx configuration
├── scripts/               # Utility scripts
├── services/
│   ├── pulseflow/        # Patient flow prediction
│   ├── careplanplus/     # Treatment recommender
│   ├── pulsenotes/       # Clinical NLP
│   └── medisync/         # RL resource allocation
├── docker-compose.yml     # Development compose
├── docker-compose.prod.yml # Production compose
├── env.example            # Environment template
└── README.md
```

## Known Limitations

1. **GPU Support**: Production docker-compose uses CPU-only inference. For GPU, modify Dockerfiles to use CUDA base images and update compose resource limits.

2. **Model Loading Time**: Large models (BERT, ClinicalBERT) may take 30-60 seconds to load on first request.

3. **Memory Usage**: CarePlanPlus and PulseNotes require 2-4GB RAM each due to transformer models.

4. **Rate Limiting**: Default 10 requests/second per IP. Adjust in nginx.conf for higher throughput.

## Q&A Transcript Summary

| Question | Answer |
|----------|--------|
| Project locations | PulseFlow: D:\DBS\HSE, CarePlanPlus: D:\project-demo\care-plan-plus, PulseNotes: D:\project-demo\pulse-notes, MediSync: D:\project-demo\medi-sync |
| Dataset | MongoDB local with MIMIC, HSE, recommender_system |
| Registry | Docker Hub (harishankarsomasundaram) |
| Hosting | Self-hosted GCP VM |
| Local compute | 12 CPU, 32GB RAM, RTX 4060 8GB |
| MLflow | Local file store |
| MongoDB URI | mongodb://localhost:27017/ |
| Demo UX | Hybrid (interactive + samples) |
| PulseFlow model | LSTM only |
| Auto-deploy | Yes, on merge to main |
| Repo strategy | New repo (portfolio-ml-health) |

## Support

- Issues: https://github.com/HSE-Pulse/portfolio-ml-health/issues
- Documentation: See `/docs` folder
- Demo: http://localhost:8080 (local) or https://your-domain.com (production)

---

Generated: 2024-01-27
Version: 1.0.0
