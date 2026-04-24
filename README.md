# HSE-Pulse — Healthcare AI Platform

Production-grade healthcare AI platform. One agentic orchestrator and four specialised deep-learning services, containerised as microservices and deployed to Google Kubernetes Engine (europe-west1). Live at **https://harishankar.info**.

| | |
|---|---|
| Cluster | GKE `hse-pulse-cluster`, project `hse-pulse-ireland`, region `europe-west1-b` |
| Ingress | GCP HTTPS Load Balancer + managed SSL, multi-subdomain routing |
| Registry | `europe-west1-docker.pkg.dev/hse-pulse-ireland/hse-pulse/` |
| Domain | `harishankar.info` and service subdomains (see below) |

---

## Services

### AI / ML services (user-facing)

| Service | Live URL | What it does | Model | Dashboard |
|---|---|---|---|---|
| **HSE Pulse Agent** | `harishankar.info/hse-pulse` | Agentic AI orchestrator — routes a single natural-language query across the other four services (diagnosis, forecasting, treatment, note search, simulation) and assembles a clinician-facing answer | LangGraph + GPT-4o, tool chaining, human-in-the-loop approval | React |
| **PulseFlow** | `pulseflow.harishankar.info` | Emergency-department trolley count forecasting across 12 Irish hospitals, 1–14 day horizon with confidence intervals | 2-layer LSTM (64 hidden units), 5-feature sliding window | React, MLflow |
| **CarePlanPlus** | `careplanplus.harishankar.info` | Personalised treatment-pathway recommendation from ICD diagnosis codes, 96 procedure classes over 15 NIES categories, 195K+ ICD code search | Fine-tuned Bio_ClinicalBERT classifier | React, Recharts |
| **PulseNotes** | `pulsenotes.harishankar.info` | Clinical note RAG — semantic search, section-aware extraction, query intent classification over 22K+ document chunks from 1,200+ patients | Bio_ClinicalBERT embeddings + FAISS + MedLLaMA2 (Ollama) | React |
| **MediSync** (DES-MARL) | `medisync.harishankar.info` | Multi-agent reinforcement learning for hospital resource allocation. 9 clinical-department agents with 5-stage curriculum. 92.9% wait-time reduction (28.4h → 2h), 137% throughput improvement (306 → 727 patients/episode) in simulation | MADDPG / MAPPO (3-layer actor/critic, 256 hidden) on MIMIC-IV | React + WebSocket live sim |

### Support services

| Service | Purpose |
|---|---|
| **landing** | Portfolio landing site (React + Vite + Tailwind behind Nginx on :6000). Serves `harishankar.info` and `www.harishankar.info` |
| **pulsediagagent** | Explainable differential-diagnosis micro-service invoked by HSE Pulse Agent (internal tool, not a public subdomain) |
| **demo-activator** | Scales idle demo pods up on request and back down after `SCALE_DOWN_AFTER_MINUTES` of inactivity — keeps cloud cost near zero between visits |
| **hse-pulse-dashboard** | Unified operations dashboard (`dashboard.harishankar.info`) |

### Infrastructure services

| Service | Purpose | Exposure |
|---|---|---|
| **mongodb** | Primary clinical data store (patients, clinical_notes, admissions, hospitals, trolley_counts, agent_conversations). PVC-backed (`mongodb-data`, 1Gi, `standard-rwo`) so data persists across pod restarts | internal |
| **mlflow** | Experiment tracking, model registry, run comparison | `mlflow.harishankar.info` |
| **minio** | S3-compatible artifact storage for MLflow model files | internal |
| **redis** | Cache layer | internal |
| **prometheus** | Metrics scraping (all services expose `/metrics`) | `prometheus.harishankar.info` |
| **grafana** | Metrics dashboards (inference latency, throughput, error rates, drift indicators) | `grafana.harishankar.info` |

### Scheduled jobs

- **tgar-scraper** (CronJob) — scrapes HSE TrolleyGAR data daily and writes to MongoDB; feeds PulseFlow's training pipeline
- **tgar-backfill** (one-shot Job) — historical backfill of trolley data
- **train-lstm-job / train-model-job** (manual Jobs) — retraining pipelines for PulseFlow and MediSync checkpoints

---

## Architecture

```
                                ┌──────────────────────────────────────────┐
                                │          GCP HTTPS Load Balancer         │
                                │         (managed SSL, harishankar.info)  │
                                └───────────────────┬──────────────────────┘
                                                    │
                              ┌─────────────────────┴─────────────────────┐
                              │            GKE Ingress (nginx)            │
                              └───┬───────┬───────┬───────┬───────┬───────┘
                                  │       │       │       │       │
                  ┌───────────────┘       │       │       │       └──────────────┐
          landing /                 pulseflow / careplanplus /               agent /
          www                       medisync    pulsenotes                   dashboard
                  │                     │              │                          │
                  └─────────────────────┴──────────────┴──────────────────────────┘
                                                    │
                              ┌─────────────────────┴─────────────────────┐
                              │  MongoDB   │   MLflow + MinIO   │  Redis  │
                              └─────────────────────┬─────────────────────┘
                                                    │
                              ┌─────────────────────┴─────────────────────┐
                              │      Prometheus + Grafana (scraping)      │
                              └───────────────────────────────────────────┘
```

- All services expose `GET /health`, `GET /metrics`, `GET /docs` (OpenAPI), and a POST inference endpoint on port 8000 (UI containers on port 4000 / 6000).
- Every deployment has `imagePullPolicy: Always` with a `:latest` tag; redeploy = push a new image + `kubectl rollout restart`.
- Pod-to-pod traffic stays inside the `hse-pulse` namespace; only the ingress is external.

---

## Quick start (local, Docker Compose)

### Prerequisites
- Docker Desktop with Compose v2+
- 16 GB RAM recommended (BERT/ClinicalBERT models load into memory)
- NVIDIA GPU optional (falls back to CPU for inference)

### Run the full stack

```bash
git clone https://github.com/HSE-Pulse/hse-pulse.git
cd hse-pulse

# Configure environment (MongoDB URI, ports, model paths, MinIO/MLflow creds)
cp env.example .env
# Edit .env as needed

# Bring everything up
docker compose up --build
```

Local endpoints:

| Endpoint | URL |
|---|---|
| Landing | http://localhost:8080/ |
| PulseFlow | http://localhost:8080/pulseflow/ |
| CarePlanPlus | http://localhost:8080/careplanplus/ |
| PulseNotes | http://localhost:8080/pulsenotes/ |
| MediSync | http://localhost:8080/medisync/ |
| HSE Pulse Agent | http://localhost:8080/hse-pulse/ |
| MLflow | http://localhost:5000 |
| Grafana | http://localhost:3000 *(admin / admin on first run)* |
| Prometheus | http://localhost:9090 |
| MinIO console | http://localhost:9001 |

Compose defines two networks — `frontend_net` (nginx + UIs) and `backend_net` (APIs, Mongo, MLflow, MinIO, Redis, Prometheus, Grafana) — and named volumes for each persistent service (`mongodb_data`, `mlflow_data`, `minio_data`, etc.).

---

## Repository layout

```
hse-pulse/
├── docker-compose.yml              # Local full stack (14 services + 2 networks)
├── docker-compose.prod.yml         # Single-VM prod variant (nginx + certbot + services)
├── env.example                     # Environment template
├── cloudbuild.yaml                 # Root Cloud Build pipeline
│
├── services/                       # Application microservices
│   ├── landing/                    # Portfolio site (Vite + React + Tailwind, nginx:alpine)
│   ├── pulseflow/                  # LSTM forecasting (FastAPI + React UI)
│   ├── careplanplus/               # BERT recommender (FastAPI + React UI)
│   ├── pulsenotes/                 # ClinicalBERT RAG (FastAPI + React UI)
│   ├── medisync/                   # MADDPG/MAPPO sim (FastAPI + React UI + checkpoints/)
│   ├── pulsediagagent/             # Differential-diagnosis tool (FastAPI)
│   └── demo-activator/             # K8s scale-on-demand controller (FastAPI + kubernetes client)
│
├── infrastructure/
│   ├── k8s/                        # GKE manifests (one folder per service + shared)
│   │   ├── namespace.yaml
│   │   ├── ingress-v4.yaml         # Current GCE ingress (managed certs, multi-host)
│   │   ├── mongodb/                # StatefulSet + PVC
│   │   ├── observability/          # Prometheus, Grafana, ServiceMonitors
│   │   ├── keda/                   # Event-driven autoscalers
│   │   ├── tgar-cronjob.yaml       # HSE trolley scraper schedule
│   │   ├── seed-data-job.yaml      # MongoDB initial seed
│   │   ├── train-lstm-job.yaml     # PulseFlow retraining
│   │   ├── cloudbuild-*.yaml       # One-off debugging / deploy builds
│   │   ├── 01-decommission-cloudrun.sh
│   │   ├── 02-create-cluster.sh
│   │   └── 03-deploy-all.sh        # End-to-end GKE bootstrap
│   ├── gcp/
│   │   ├── vm-setup.sh             # VM bootstrap (Docker + compose)
│   │   └── setup-ssl.sh            # Let's Encrypt wiring for VM mode
│   ├── dns/                        # Cloud DNS zone + A/AAAA records
│   ├── cloud-functions/            # Peripheral functions (e.g. demo wakeups)
│   ├── systemd/                    # Compose-as-a-service unit files
│   ├── scrape_tgar.py              # Standalone HSE TrolleyGAR scraper
│   ├── fetch-hse-data.py
│   ├── seed-data.js                # MongoDB seed script
│   └── gcp-deploy.sh               # Legacy single-command deploy
│
├── proxy/                          # Nginx reverse proxy (compose-mode only)
├── mongodb/init/                   # Mongo init scripts
├── monitoring/                     # Prometheus + Grafana config + dashboards
├── scripts/                        # Build + smoke-test helpers
├── training/                       # Standalone training pipelines
├── docs/                           # GCP deployment guides, privacy, release notes
└── .github/workflows/              # CI/CD pipelines
```

---

## Deployment

### GKE (production — what's live at `harishankar.info`)

```bash
# Authenticate with the ireland project
gcloud auth login
gcloud config set project hse-pulse-ireland
gcloud container clusters get-credentials hse-pulse-cluster \
    --region=europe-west1-b --project=hse-pulse-ireland

# Bring up or update everything from the k8s manifests
bash infrastructure/k8s/03-deploy-all.sh
```

### Per-service redeploy (landing as an example)

```bash
cd services/landing
gcloud builds submit \
    --tag europe-west1-docker.pkg.dev/hse-pulse-ireland/hse-pulse/landing:latest \
    --project=hse-pulse-ireland .
kubectl rollout restart deployment/landing -n hse-pulse
kubectl rollout status  deployment/landing -n hse-pulse --timeout=180s
```

The same pattern applies to every service (`pulseflow`, `careplanplus`, `pulsenotes`, `medisync`, `pulsediagagent`, `hse-pulse-dashboard`, `demo-activator`). The `redeploy.bat` inside each `services/<svc>/` wraps these commands.

### Single-VM deployment (compose-based, for dev / on-prem)

```bash
git clone https://github.com/HSE-Pulse/hse-pulse.git
cd hse-pulse
cp env.example .env.prod && $EDITOR .env.prod
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
./infrastructure/gcp/setup-ssl.sh your-domain.com   # Let's Encrypt
```

### CI/CD

Pushes to `master` trigger `.github/workflows/` which build each service, push images to Artifact Registry, and (optionally) call `kubectl rollout restart`. Cloud Build pipelines under `infrastructure/k8s/cloudbuild-*.yaml` cover one-off deploys, database health checks, and training jobs.

---

## Model & data provisioning

### Model artifacts

Each service looks for a model under `services/<svc>/app/models/` at container start. In production, the image bakes a versioned checkpoint; for local development, point the service at your own with the `*_MODEL_PATH` variables in `.env`:

```
PULSEFLOW_MODEL_PATH=/app/models/lstm_model.pth
CAREPLANPLUS_MODEL_PATH=/app/models/bert_model.pth
PULSENOTES_MODEL_PATH=/app/models/clinicalbert
MEDISYNC_MODEL_PATH=/app/models/checkpoints/final
```

`services/*/model_manifest.json` documents the architecture and input schema of each deployed checkpoint (e.g., PulseFlow's 2-layer LSTM, MediSync's MADDPG+MAPPO actor/critic).

### Data

- **MongoDB** is the canonical clinical store. `infrastructure/seed-data.js` and `infrastructure/k8s/seed-data-job.yaml` seed hospitals, trolley counts, and sample notes.
- **MIMIC-IV** is required for real training; the repo ships with synthetic samples only. Follow `docs/privacy_and_compliance.md` for PhysioNet setup and PHI handling.
- **HSE TrolleyGAR**: `infrastructure/scrape_tgar.py` + the `tgar-scraper` CronJob collect real public trolley counts daily.

---

## API contract (every inference service)

```
GET  /health     → liveness + model/index load state
GET  /metrics    → Prometheus exposition format
GET  /docs       → interactive OpenAPI UI
POST /query      → natural-language query (where applicable)
POST /predict    → structured inference (LSTM, BERT, MADDPG)
GET  /patients/{id}/notes   → PulseNotes
POST /admin/sync-patients   → PulseNotes (rebuild patients collection from clinical_notes)
POST /train                 → on-demand retraining where supported
```

---

## Observability

- **Prometheus** scrapes every pod via `prometheus.io/scrape: "true"` annotations and the `/metrics` endpoint.
- **Grafana** dashboards cover: request rate / latency / error rate per service, model inference time, GPU/CPU utilisation, MongoDB ops/s, and custom per-model drift panels (e.g., PulseFlow MAE rolling).
- All services emit structured JSON logs; GKE streams them to Cloud Logging.

---

## Security & compliance

This codebase handles clinical data. Before pointing it at real PHI:

- Read `docs/privacy_and_compliance.md` — GDPR checklist, PHI anonymisation, retention policy.
- Never commit `.env`, model checkpoints trained on real PHI, or raw MIMIC/HSE extracts.
- MongoDB on GKE is ClusterIP-only; do not expose `:27017` through the ingress.
- Secrets (`MONGO_URI`, `MINIO_ROOT_PASSWORD`, Ollama tokens) are provisioned via Kubernetes Secrets, not baked into images.

---

## Documentation

Deep-dives live under `docs/`:

- `docs/gke_kubernetes_architecture.md` — cluster, node pools, ingress, taints/tolerations
- `docs/gcp_deployment_requirements.md` — IAM, billing, quotas
- `docs/gcp_interview_demo_deployment.md` — demo-activator-driven cold-start flow
- `docs/gcp_ondemand_demo_architecture.md` — how idle services scale to zero and back
- `docs/privacy_and_compliance.md` — GDPR + PHI handling
- `docs/demo_steps.md` — scripted walkthrough for reviewers
- `docs/release_notes.md` — per-deploy changelog
- `docs/smoke_test.sh` — post-deploy end-to-end sanity check

---

## License

Research and educational use. Contact the maintainer for commercial licensing.

## Author

Harishankar Somasundaram — Dublin, Ireland
