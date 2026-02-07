# Healthcare ML Portfolio

Integrated healthcare machine learning portfolio featuring four AI/ML projects for clinical decision support, patient flow prediction, and resource optimization.

## Projects

| Service | Description | Model | Demo Type |
|---------|-------------|-------|-----------|
| **PulseFlow** | LSTM ED trolley forecasting across 12 Irish hospitals | LSTM, FastAPI, React, MLflow | Interactive |
| **CarePlanPlus** | BERT treatment pathway recommendation — 96 procedure classes | BERT, FastAPI, React, MLflow | Interactive |
| **PulseNotes** | Clinical NLP with RAG for note analysis | Bio_ClinicalBERT + FAISS | Samples |
| **MediSync** | Multi-agent RL for hospital resource allocation | MADDPG + MAPPO | Samples |

## Quick Start (Local Development)

### Prerequisites
- Docker & Docker Compose v2+
- NVIDIA GPU (optional, for training)
- 16GB+ RAM recommended

### One-Click Local Deploy

```bash
# Clone the repository
git clone https://github.com/HSE-Pulse/hse-pulse.git
cd hse-pulse

# Copy environment file and configure
cp env.example .env
# Edit .env with your MongoDB URI and other settings

# Start all services
docker-compose up --build

# Access services at:
# - Demo UI: http://localhost:8080
# - PulseFlow: http://localhost:8080/pulseflow/
# - CarePlanPlus: http://localhost:8080/careplanplus/
# - PulseNotes: http://localhost:8080/pulsenotes/
# - MediSync: http://localhost:8080/medisync/
# - MLflow: http://localhost:5000
# - Grafana: http://localhost:3000 (admin/admin)
# - Prometheus: http://localhost:9090
```

## Project Structure

```
hse-pulse/
├── docker-compose.yml          # Development compose
├── docker-compose.prod.yml     # Production compose (GCP VM)
├── env.example                 # Environment template
├── infrastructure/             # Deployment configs
│   ├── gcp/                   # GCP VM setup scripts
│   └── systemd/               # Systemd service files
├── services/                   # Microservices
│   ├── pulseflow/             # Patient flow prediction
│   ├── careplanplus/          # Treatment recommender
│   ├── pulsenotes/            # Clinical NLP
│   └── medisync/              # RL resource allocation
├── proxy/                      # Nginx reverse proxy
├── mlflow/                     # Model registry config
├── minio/                      # Object storage config
├── monitoring/                 # Prometheus + Grafana
├── ci/                         # GitHub Actions workflows
├── demo-ui/                    # Static demo website
└── docs/                       # Documentation
```

## Providing Your Own Models/Datasets

### Model Paths
Each service looks for models in `./models/<service>/<version>/`:
```bash
models/
├── pulseflow/v1/lstm_model.pth
├── careplanplus/v1/bert_model.pth
├── pulsenotes/v1/clinicalbert/
└── medisync/v1/maddpg_checkpoint.pth
```

### Dataset Configuration
1. **MongoDB**: Set `MONGO_URI` in `.env` pointing to your MIMIC/HSE database
2. **Synthetic Data**: Run `python scripts/generate_synthetic.py` for demo data
3. **MIMIC Access**: See `docs/data_guide.md` for PhysioNet setup

## API Endpoints

Each service exposes:
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics
- `POST /predict` - Model inference
- `GET /docs` - OpenAPI documentation

## Production Deployment (GCP VM)

```bash
# On your GCP VM
git clone https://github.com/HSE-Pulse/hse-pulse.git
cd hse-pulse

# Configure production settings
cp env.example .env.prod
# Edit .env.prod with production values

# Deploy with production compose
docker-compose -f docker-compose.prod.yml up -d

# Enable HTTPS with Let's Encrypt
./infrastructure/gcp/setup-ssl.sh your-domain.com
```

## CI/CD

- Push to `main` triggers build and deploy to GCP VM
- Images pushed to Docker Hub: `harishankarsomasundaram/<service>`
- See `.github/workflows/` for pipeline details

## Security & Compliance

**IMPORTANT**: This portfolio handles clinical data. See `docs/privacy_and_compliance.md` for:
- GDPR compliance checklist
- PHI anonymization requirements
- Data retention policies
- Never commit real patient data

## License

Research and educational use. Contact maintainers for commercial licensing.

## Authors

HSE-Pulse Research Team
