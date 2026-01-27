# Healthcare ML Portfolio - Model Training

Training scripts with MLflow integration for all portfolio models.

## Prerequisites

```bash
# Install dependencies
pip install -r requirements.txt

# Start MLflow tracking server (optional - for UI)
mlflow server --host 0.0.0.0 --port 5000
```

## Training Scripts

### 1. PulseFlow - LSTM Time Series Prediction

Trains an LSTM model for HSE trolley wait time forecasting.

```bash
python train_pulseflow.py \
    --epochs 30 \
    --batch-size 32 \
    --learning-rate 0.001 \
    --n-days 365 \
    --seq-length 14 \
    --forecast-horizon 7 \
    --output-dir ../models/pulseflow \
    --mlflow-uri http://localhost:5000 \
    --experiment-name PulseFlow-LSTM
```

**Model Architecture:**
- LSTM with 2 layers, 128 hidden units
- Input: 14-day sequence of 5 features
- Output: 7-day forecast

**Metrics Logged:**
- train_loss, val_loss, val_mae, val_rmse, val_r2

### 2. CarePlanPlus - BERT Procedure Recommendation

Trains a BERT-based model for ICD-10-PCS procedure prediction from diagnosis sequences.

```bash
python train_careplanplus.py \
    --epochs 5 \
    --batch-size 16 \
    --learning-rate 2e-5 \
    --n-samples 500 \
    --output-dir ../models/careplanplus \
    --mlflow-uri http://localhost:5000 \
    --experiment-name CarePlanPlus-BERT
```

**Model Architecture:**
- BERT-base-uncased with frozen early layers
- Classification head: 768 -> 256 -> n_procedures

**Metrics Logged:**
- train_loss, train_accuracy, val_loss, val_accuracy
- precision, recall, f1_score

### 3. PulseNotes - Clinical NER

Fine-tunes Bio_ClinicalBERT for clinical named entity recognition.

```bash
python train_pulsenotes.py \
    --epochs 5 \
    --batch-size 16 \
    --learning-rate 2e-5 \
    --n-samples 500 \
    --output-dir ../models/pulsenotes \
    --mlflow-uri http://localhost:5000 \
    --experiment-name PulseNotes-NER
```

**Model Architecture:**
- Bio_ClinicalBERT base
- Token classification head for NER

**Entity Types:**
- PROBLEM, TREATMENT, TEST, DRUG

**Metrics Logged:**
- train_loss, val_loss, val_f1, precision, recall

### 4. MediSync - MADDPG Multi-Agent RL

Trains multi-agent deep deterministic policy gradient for hospital resource allocation.

```bash
python train_medisync.py \
    --episodes 500 \
    --batch-size 64 \
    --lr-actor 1e-4 \
    --lr-critic 1e-3 \
    --gamma 0.95 \
    --tau 0.01 \
    --output-dir ../models/medisync \
    --mlflow-uri http://localhost:5000 \
    --experiment-name MediSync-MADDPG
```

**Model Architecture:**
- Actor-Critic networks per department (Emergency, ICU, Surgery, General Ward)
- State: 20-dimensional (5 features per department)
- Action: 5 allocation levels

**Metrics Logged:**
- episode_reward, eval_mean_reward, critic_loss, actor_loss per department

## MLflow UI

Access the MLflow tracking UI at http://localhost:5000 to:
- Compare experiment runs
- View metrics and parameters
- Download model artifacts
- Register models for deployment

## Quick Start

Train all models with default settings:

```bash
# Start MLflow server
mlflow server --host 0.0.0.0 --port 5000 &

# Train all models
python train_pulseflow.py
python train_careplanplus.py
python train_pulsenotes.py
python train_medisync.py
```

## Model Artifacts

After training, models are saved to:
- `../models/pulseflow/lstm_model.pth`
- `../models/careplanplus/bert_model.pth`
- `../models/pulsenotes/ner_model.pth`
- `../models/medisync/maddpg_checkpoint.pth`

## Docker Integration

To run training with Docker:

```bash
# Build training image
docker build -t healthcare-ml-training -f Dockerfile.training .

# Run training
docker run --gpus all -v $(pwd)/../models:/models healthcare-ml-training python train_pulseflow.py
```

## Prometheus & Grafana Integration

Models are monitored in production via:
- **Prometheus**: Scrapes metrics from service endpoints (`/metrics`)
- **Grafana**: Visualizes inference latency, prediction counts, model health

Access Grafana dashboard at http://localhost:3000 (admin/admin)
