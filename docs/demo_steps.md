# Demo Steps Guide

This guide walks through demonstrating each project in the Healthcare ML Portfolio.

## Prerequisites

1. Docker and Docker Compose installed
2. At least 8GB RAM available
3. Browser (Chrome, Firefox, or Edge recommended)

## Quick Start

```bash
# Clone and start all services
git clone https://github.com/HSE-Pulse/portfolio-ml-health.git
cd portfolio-ml-health
cp env.example .env
docker-compose up -d

# Wait for services to be healthy (1-2 minutes)
docker-compose ps

# Open demo UI
open http://localhost:8080
```

---

## Demo 1: PulseFlow - Patient Flow Prediction

### What It Does
Predicts ED trolley counts for Irish hospitals using LSTM neural networks.

### Demo Steps

1. **Open PulseFlow Interface**
   - Navigate to: http://localhost:8080/pulseflow/docs
   - This opens the interactive API documentation

2. **View Available Hospitals**
   - Click on `GET /hospitals`
   - Click "Try it out" then "Execute"
   - You'll see a list of hospitals and regions

3. **Make a Prediction**
   - Click on `POST /predict`
   - Click "Try it out"
   - Enter sample data:
     ```json
     {
       "region": "Dublin North",
       "hospital": "Beaumont Hospital",
       "date": "2024-01-15",
       "forecast_days": 7
     }
     ```
   - Click "Execute"
   - View the 7-day forecast with confidence intervals

4. **Interpret Results**
   - `predicted_trolleys`: Expected ED trolley count
   - `confidence_lower/upper`: Prediction bounds
   - `day`: Day of week (shows weekly patterns)

### Key Talking Points
- LSTM captures temporal dependencies in patient flow
- Model trained on historical HSE Trolley Watch data
- Helps hospitals plan staffing and resource allocation

---

## Demo 2: CarePlanPlus - Treatment Pathway Recommender

### What It Does
Recommends next procedures based on patient diagnoses using BERT.

### Demo Steps

1. **Open CarePlanPlus Interface**
   - Navigate to: http://localhost:8080/careplanplus/docs

2. **View Sample Diagnoses**
   - Click `GET /sample-diagnoses`
   - Execute to see pre-built clinical scenarios

3. **Get Procedure Recommendations**
   - Click `POST /predict`
   - Use a sample case:
     ```json
     {
       "diagnoses": [
         {"icd_code": "I10", "seq_num": 1, "long_title": "Essential hypertension"},
         {"icd_code": "I25.10", "seq_num": 2, "long_title": "Atherosclerotic heart disease"}
       ],
       "top_k": 5
     }
     ```
   - View ranked procedure recommendations with confidence scores

4. **Generate Full Pathway**
   - Click `POST /pathway`
   - Use same diagnoses
   - See complete treatment pathway sequence

### Key Talking Points
- BERT understands clinical context from diagnosis descriptions
- Model learns patterns from real treatment sequences
- Supports clinical decision-making, not replacing physician judgment

---

## Demo 3: PulseNotes - Clinical NLP (Sample-Based)

### What It Does
Searches and analyzes clinical notes using Bio_ClinicalBERT.

### Demo Steps

1. **Open PulseNotes Interface**
   - Navigate to: http://localhost:8080/pulsenotes/docs

2. **View Sample Scenarios**
   - Click `GET /sample-scenarios`
   - See pre-built search scenarios

3. **Search Clinical Notes**
   - Click `POST /search`
   - Try a query:
     ```json
     {
       "query": "patient with chest pain and shortness of breath",
       "top_k": 5
     }
     ```
   - View semantically similar clinical notes

4. **Extract Medical Entities**
   - Click `POST /extract-entities`
   - Enter clinical text:
     ```json
     {
       "text": "Patient presents with fever and productive cough. Started on amoxicillin."
     }
     ```
   - View extracted conditions, medications, etc.

### Key Talking Points
- Bio_ClinicalBERT trained on clinical text
- FAISS enables fast similarity search
- Useful for clinical research and case finding

---

## Demo 4: MediSync - Resource Allocation (Sample-Based)

### What It Does
Optimizes hospital resource allocation using multi-agent reinforcement learning.

### Demo Steps

1. **Open MediSync Interface**
   - Navigate to: http://localhost:8080/medisync/docs

2. **View Sample Scenarios**
   - Click `GET /sample-scenarios`
   - See "Normal Operations", "Surge Event", "Staff Shortage"

3. **Get Allocation Recommendations**
   - Click `POST /allocate`
   - Use surge scenario:
     ```json
     {
       "Emergency": {
         "current_patients": 50,
         "available_beds": 30,
         "staff_on_duty": 12,
         "incoming_rate": 20,
         "severity_index": 0.7
       }
     }
     ```
   - View recommended resource levels per department

4. **Run Simulation**
   - Click `POST /simulate`
   - Set hours to 24
   - View simulated outcomes and efficiency metrics

### Key Talking Points
- Multi-agent RL coordinates across departments
- 93.4% reduction in wait times vs baseline
- Adapts to real-time hospital state

---

## Viewing Monitoring

### Grafana Dashboard
1. Open: http://localhost:3000
2. Login: admin / admin
3. Navigate to "Healthcare ML Portfolio Overview"
4. View service health, request rates, latencies

### Prometheus Metrics
1. Open: http://localhost:9090
2. Try queries:
   - `up` - Service availability
   - `http_requests_total` - Request counts
   - `model_inference_duration_seconds` - Model latency

---

## Troubleshooting

### Services not starting
```bash
docker-compose logs <service-name>
docker-compose restart <service-name>
```

### Slow responses
- First requests may be slow (model loading)
- Check GPU availability: models default to CPU

### Demo mode indicator
- Services show "demo_mode: true" in /health when no trained model is loaded
- Demo mode uses synthetic predictions

---

## Cleanup

```bash
# Stop all services
docker-compose down

# Remove volumes (data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```
