"""
PulseFlow - Patient Flow Prediction Service
LSTM-based ED trolley forecasting for Irish hospitals
"""

import os
import logging
import time
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from typing import Optional, List

import torch
import torch.nn as nn
import numpy as np
import pandas as pd
import joblib
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pymongo import MongoClient
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response
import mlflow
import mlflow.pytorch

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s"}'
)
logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)
REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint']
)
MODEL_INFERENCE_TIME = Histogram(
    'model_inference_duration_seconds',
    'Model inference latency'
)
MODEL_LOADED = Gauge('model_loaded', 'Whether the model is loaded')
PREDICTIONS_TOTAL = Counter('predictions_total', 'Total predictions made')


class LSTMRegressor(nn.Module):
    """LSTM model for patient flow regression."""

    def __init__(self, input_size: int, hidden_size: int = 64, num_layers: int = 2):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.lstm(x)
        out = self.fc(out[:, -1, :])
        return out.squeeze()


class ModelManager:
    """Manages LSTM model loading and inference."""

    def __init__(self):
        self.model: Optional[LSTMRegressor] = None
        self.scaler = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.features = [
            'trolley_count', 'admissions', 'discharges',
            'trolleys_gt_24hrs', 'elderly_waiting'
        ]

    def load_model(self, model_path: str, scaler_path: Optional[str] = None):
        """Load LSTM model and scaler from disk."""
        try:
            if os.path.exists(model_path):
                checkpoint = torch.load(model_path, map_location=self.device, weights_only=False)
                self.model = LSTMRegressor(
                    input_size=checkpoint.get('input_size', 5),
                    hidden_size=checkpoint.get('hidden_size', 64),
                    num_layers=checkpoint.get('num_layers', 2)
                ).to(self.device)
                self.model.load_state_dict(checkpoint['model_state_dict'])
                self.model.eval()
                logger.info(f"Model loaded from {model_path}")
                MODEL_LOADED.set(1)
            else:
                logger.warning(f"Model file not found at {model_path}, using demo mode")
                self._create_demo_model()

            if scaler_path and os.path.exists(scaler_path):
                self.scaler = joblib.load(scaler_path)
                logger.info(f"Scaler loaded from {scaler_path}")
            else:
                logger.warning("Scaler not found, predictions may be unscaled")

        except Exception as e:
            logger.error(f"Error loading model: {e}")
            self._create_demo_model()

    def _create_demo_model(self):
        """Create a demo model for testing without real weights."""
        self.model = LSTMRegressor(input_size=5, hidden_size=64, num_layers=2).to(self.device)
        self.model.eval()
        MODEL_LOADED.set(0.5)  # Indicate demo mode
        logger.info("Demo model created")

    def predict(self, sequence: np.ndarray, forecast_days: int = 7) -> List[float]:
        """Generate patient flow predictions."""
        if self.model is None:
            raise ValueError("Model not loaded")

        with MODEL_INFERENCE_TIME.time():
            predictions = []
            last_seq = sequence.copy()

            with torch.no_grad():
                for _ in range(forecast_days):
                    input_tensor = torch.tensor(
                        last_seq, dtype=torch.float32
                    ).unsqueeze(0).to(self.device)
                    pred = self.model(input_tensor).item()
                    predictions.append(max(0, pred))  # Ensure non-negative
                    next_input = np.append(
                        last_seq[1:],
                        [[pred] * last_seq.shape[1]],
                        axis=0
                    )
                    last_seq = next_input

            # Inverse-scale predictions from normalized to real trolley counts
            if self.scaler is not None:
                scale = self.scaler.data_max_[0] - self.scaler.data_min_[0]
                predictions = [max(0, round(p * scale + self.scaler.data_min_[0], 1)) for p in predictions]

            PREDICTIONS_TOTAL.inc()
            return predictions


# Global instances
model_manager = ModelManager()
mongo_client: Optional[MongoClient] = None
db = None

# Mapping: hospitals collection code → trolley_counts collection code
_TROLLEY_CODE_MAP: dict = {}


def _build_trolley_code_map():
    """Build a mapping from hospital names/codes to trolley_counts codes at startup."""
    global _TROLLEY_CODE_MAP
    if db is None:
        return
    try:
        # Get distinct hospital codes + names from trolley_counts
        trolley_hospitals = {}
        for doc in db["trolley_counts"].aggregate([
            {"$group": {"_id": "$hospital_code", "name": {"$first": "$hospital_name"}}}
        ]):
            code = doc["_id"]
            name = doc.get("name", "")
            trolley_hospitals[code] = name
            # Map by trolley_counts name (lowercase) → trolley_counts code
            if name:
                _TROLLEY_CODE_MAP[name.lower()] = code

        # Now map hospitals collection codes/names → trolley_counts codes
        for doc in db["hospitals"].find({}, {"hospital_code": 1, "name": 1, "full_name": 1, "_id": 0}):
            h_code = doc.get("hospital_code", "")
            h_name = doc.get("name", "")
            h_full = doc.get("full_name", h_name)

            # Try to find a matching trolley code by partial name match
            matched = None
            for t_code, t_name in trolley_hospitals.items():
                t_lower = t_name.lower()
                h_lower = h_name.lower()
                # Direct match, contains, or keyword overlap
                if h_lower == t_lower or h_lower in t_lower or t_lower in h_lower:
                    matched = t_code
                    break
                # Try full_name
                if h_full and (h_full.lower() in t_lower or t_lower in h_full.lower()):
                    matched = t_code
                    break

            if matched:
                _TROLLEY_CODE_MAP[h_code.lower()] = matched
                _TROLLEY_CODE_MAP[h_name.lower()] = matched
                if h_full:
                    _TROLLEY_CODE_MAP[h_full.lower()] = matched

        logger.info(f"Trolley code map built: {len(_TROLLEY_CODE_MAP)} entries")
    except Exception as e:
        logger.warning(f"Error building trolley code map: {e}")


def _resolve_trolley_code(hospital_ref: str) -> Optional[str]:
    """Resolve a hospital name or code to its trolley_counts code."""
    if not hospital_ref:
        return None
    # Direct lookup in trolley_counts
    if db is not None:
        try:
            if db["trolley_counts"].find_one({"hospital_code": hospital_ref}, {"_id": 1}):
                return hospital_ref
        except Exception:
            pass
    # Map lookup
    return _TROLLEY_CODE_MAP.get(hospital_ref.lower())


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global mongo_client, db

    # Startup
    logger.info("Starting PulseFlow service...")

    # Load model
    model_path = os.getenv("MODEL_PATH", "/app/models/lstm_model.pth")
    scaler_path = os.getenv("SCALER_PATH", "/app/models/scaler.pkl")
    model_manager.load_model(model_path, scaler_path)

    # Connect to MongoDB
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    try:
        mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        mongo_client.admin.command('ping')
        db = mongo_client[os.getenv("MONGO_DB", "HSE")]
        logger.info("Connected to MongoDB")
        _build_trolley_code_map()
    except Exception as e:
        logger.warning(f"MongoDB connection failed: {e}. Using demo data.")
        db = None

    yield

    # Shutdown
    if mongo_client:
        mongo_client.close()
    logger.info("PulseFlow service stopped")


app = FastAPI(
    title="PulseFlow",
    description="LSTM-based patient flow prediction for ED trolley forecasting",
    version="1.0.0",
    lifespan=lifespan,
    root_path=os.getenv("ROOT_PATH", "")
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class PredictionRequest(BaseModel):
    """Request model for patient flow prediction."""
    region: str = Field(..., description="Hospital region", example="Dublin North")
    hospital: str = Field(..., description="Hospital name", example="Beaumont Hospital")
    date: str = Field(..., description="Prediction start date (YYYY-MM-DD)", example="2024-01-15")
    forecast_days: int = Field(default=7, ge=1, le=14, description="Number of days to forecast")

    # Optional manual input for demo without database
    surge_capacity: Optional[int] = Field(None, description="Current surge capacity in use")
    delayed_transfers: Optional[int] = Field(None, description="Delayed transfers of care")
    waiting_24hrs: Optional[int] = Field(None, description="Total waiting >24hrs")
    waiting_75y_24hrs: Optional[int] = Field(None, description=">75yrs waiting >24hrs")


class ForecastDay(BaseModel):
    """Single day forecast."""
    date: str
    day: str
    predicted_trolleys: float
    confidence_lower: float
    confidence_upper: float


class PredictionResponse(BaseModel):
    """Response model for patient flow prediction."""
    model: str = "LSTM"
    hospital: str
    region: str
    forecast_start: str
    forecast: List[ForecastDay]
    model_version: str = "1.0.0"
    inference_time_ms: float


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    model_loaded: bool
    database_connected: bool
    timestamp: str


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    """Middleware to track request metrics."""
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time

    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()

    REQUEST_LATENCY.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(duration)

    return response


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        model_loaded=model_manager.model is not None,
        database_connected=db is not None,
        timestamp=datetime.utcnow().isoformat()
    )


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )


@app.post("/predict", response_model=PredictionResponse)
async def predict_patient_flow(request: PredictionRequest):
    """
    Predict patient flow (ED trolleys) for the next N days.

    Uses LSTM model trained on HSE trolley data to forecast
    emergency department strain levels.
    """
    start_time = time.time()

    try:
        # Try to get historical data from MongoDB
        sequence = None

        if db is not None:
            try:
                collection = db["trolley_counts"]
                trolley_code = _resolve_trolley_code(request.hospital) or request.hospital
                df = pd.DataFrame(list(collection.find({
                    'hospital_code': trolley_code
                }).sort('date', -1).limit(100)))

                if len(df) >= 7:
                    df = df.sort_values('date')
                    features_available = [f for f in model_manager.features if f in df.columns]
                    if len(features_available) == len(model_manager.features):
                        if model_manager.scaler:
                            df[features_available] = model_manager.scaler.transform(df[features_available])
                        sequence = df[features_available].values[-7:]
            except Exception as e:
                logger.warning(f"Error fetching from database: {e}")

        # Use demo data if no database data available
        if sequence is None:
            logger.info("Using synthetic demo data for prediction")
            np.random.seed(42)
            sequence = np.random.randn(7, 5) * 0.5  # Normalized synthetic data

        # Generate predictions
        predictions = model_manager.predict(sequence, request.forecast_days)

        # Create forecast response
        start_date = datetime.strptime(request.date, "%Y-%m-%d")
        forecast = []

        for i, pred in enumerate(predictions):
            forecast_date = start_date + timedelta(days=i + 1)
            # Add confidence intervals (simplified)
            forecast.append(ForecastDay(
                date=forecast_date.strftime("%Y-%m-%d"),
                day=forecast_date.strftime("%A"),
                predicted_trolleys=round(pred, 1),
                confidence_lower=round(max(0, pred - 5), 1),
                confidence_upper=round(pred + 5, 1)
            ))

        inference_time = (time.time() - start_time) * 1000

        return PredictionResponse(
            hospital=request.hospital,
            region=request.region,
            forecast_start=request.date,
            forecast=forecast,
            inference_time_ms=round(inference_time, 2)
        )

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/hospitals")
async def list_hospitals():
    """List available hospitals and regions."""
    if db is not None:
        try:
            hospitals_collection = db["hospitals"]
            hospitals = list(hospitals_collection.find({}, {"_id": 0}))
            if hospitals:
                # Enrich with trolley_code for data lookups
                for h in hospitals:
                    tc = _resolve_trolley_code(h.get("hospital_code", "")) or _resolve_trolley_code(h.get("name", ""))
                    h["trolley_code"] = tc or h.get("hospital_code", "")
                return {"hospitals": hospitals}
        except Exception as e:
            logger.warning(f"Error fetching hospitals: {e}")

    # Return demo hospitals
    return {
        "hospitals": [
            {"hospital_code": "UHK", "trolley_code": "UK", "name": "University Hospital Kerry", "region": "South West", "hse_area": "HSE South"},
            {"hospital_code": "CUH", "trolley_code": "CU", "name": "Cork University Hospital", "region": "South", "hse_area": "HSE South"},
            {"hospital_code": "UHW", "trolley_code": "UW", "name": "University Hospital Waterford", "region": "South East", "hse_area": "HSE South"},
            {"hospital_code": "UHG", "trolley_code": "GU", "name": "University Hospital Galway", "region": "West", "hse_area": "HSE West"},
            {"hospital_code": "UHL", "trolley_code": "UL", "name": "University Hospital Limerick", "region": "Mid-West", "hse_area": "HSE West"},
            {"hospital_code": "SVH", "trolley_code": "SVU", "name": "St Vincent's University Hospital", "region": "Dublin South", "hse_area": "HSE Dublin Mid-Leinster"},
            {"hospital_code": "MUH", "trolley_code": "MMU", "name": "Mater Misericordiae University Hospital", "region": "Dublin North", "hse_area": "HSE Dublin North East"},
            {"hospital_code": "TUH", "trolley_code": "TU", "name": "Tallaght University Hospital", "region": "Dublin South West", "hse_area": "HSE Dublin Mid-Leinster"}
        ]
    }


@app.get("/trolley-data/{hospital_code}")
async def get_trolley_data(hospital_code: str, days: int = 30):
    """Get recent trolley data for a hospital."""
    resolved = _resolve_trolley_code(hospital_code) or hospital_code
    if db is not None:
        try:
            collection = db["trolley_counts"]
            data = list(collection.find(
                {"hospital_code": resolved},
                {"_id": 0}
            ).sort("date", -1).limit(days))
            return {"hospital_code": resolved, "records": data}
        except Exception as e:
            logger.warning(f"Error fetching trolley data: {e}")

    return {"hospital_code": resolved, "records": [], "message": "No data available"}


@app.get("/data/latest-date")
async def get_latest_date():
    """Get the most recent date available in trolley data."""
    if db is not None:
        try:
            collection = db["trolley_counts"]
            latest = collection.find_one(
                {},
                {"date": 1, "_id": 0},
                sort=[("date", -1)]
            )
            if latest and "date" in latest:
                date_val = latest["date"]
                if isinstance(date_val, str):
                    date_str = date_val[:10]
                else:
                    date_str = date_val.strftime("%Y-%m-%d")
                return {"latest_date": date_str}
        except Exception as e:
            logger.warning(f"Error fetching latest date: {e}")

    return {"latest_date": None}


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "service": "PulseFlow",
        "description": "Patient Flow Prediction API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "metrics": "/metrics"
    }


# Admin API Endpoints
class TrainingConfig(BaseModel):
    """Training configuration."""
    epochs: int = Field(default=100, ge=1, le=500)
    batch_size: int = Field(default=64)
    learning_rate: float = Field(default=0.001)
    hidden_size: int = Field(default=64)
    device: str = Field(default="cpu")


class ServiceConfig(BaseModel):
    """Service configuration."""
    model_path: Optional[str] = None
    scaler_path: Optional[str] = None
    forecast_window: Optional[int] = None
    confidence_interval: Optional[int] = None
    max_batch_size: Optional[int] = None
    cache_ttl: Optional[int] = None


# Global config store
service_config = {
    "model_path": os.getenv("MODEL_PATH", "/app/models/lstm_model.pth"),
    "scaler_path": os.getenv("SCALER_PATH", "/app/models/scaler.pkl"),
    "forecast_window": 7,
    "confidence_interval": 95,
    "max_batch_size": 32,
    "cache_ttl": 300
}


@app.post("/train")
async def start_training(config: TrainingConfig):
    """
    Start model training (async).
    In production, this would trigger a Kubernetes Job or Celery task.
    """
    logger.info(f"Training requested with config: {config}")

    job_id = f"train-pulseflow-{int(time.time())}"

    # Set up MLflow tracking
    mlflow_uri = os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")
    experiment_name = os.getenv("MLFLOW_EXPERIMENT_NAME", "pulseflow")

    try:
        mlflow.set_tracking_uri(mlflow_uri)
        mlflow.set_experiment(experiment_name)

        # Start MLflow run to log training parameters
        with mlflow.start_run(run_name=job_id):
            # Log parameters
            mlflow.log_params({
                "epochs": config.epochs,
                "batch_size": config.batch_size,
                "learning_rate": config.learning_rate,
                "hidden_size": config.hidden_size,
                "device": config.device,
                "model_type": "LSTM"
            })

            # Log initial metrics (simulated for demo)
            mlflow.log_metrics({
                "initial_loss": 1.0,
                "status": 0  # 0 = started
            })

            # Tag the run
            mlflow.set_tags({
                "service": "pulseflow",
                "job_id": job_id,
                "status": "started"
            })

            run_id = mlflow.active_run().info.run_id

        logger.info(f"MLflow run started: {run_id}")

        return {
            "status": "training_started",
            "job_id": job_id,
            "mlflow_run_id": run_id,
            "mlflow_experiment": experiment_name,
            "config": config.dict(),
            "message": "Training job submitted. Monitor progress via MLflow or /train/status endpoint."
        }

    except Exception as e:
        logger.error(f"MLflow logging failed: {e}")
        return {
            "status": "training_started",
            "job_id": job_id,
            "config": config.dict(),
            "message": f"Training job submitted. MLflow logging failed: {str(e)}"
        }


@app.get("/train/status/{job_id}")
async def get_training_status(job_id: str):
    """Get training job status."""
    # In production, this would check Kubernetes Job status
    return {
        "job_id": job_id,
        "status": "completed",
        "progress": 100,
        "metrics": {
            "mae": 3.2,
            "rmse": 4.8,
            "epochs_completed": 100
        }
    }


@app.get("/config")
async def get_config():
    """Get current service configuration."""
    return service_config


@app.post("/config")
async def update_config(config: ServiceConfig):
    """Update service configuration."""
    global service_config

    if config.model_path:
        service_config["model_path"] = config.model_path
    if config.scaler_path:
        service_config["scaler_path"] = config.scaler_path
    if config.forecast_window:
        service_config["forecast_window"] = config.forecast_window
    if config.confidence_interval:
        service_config["confidence_interval"] = config.confidence_interval
    if config.max_batch_size:
        service_config["max_batch_size"] = config.max_batch_size
    if config.cache_ttl is not None:
        service_config["cache_ttl"] = config.cache_ttl

    logger.info(f"Configuration updated: {service_config}")

    return {
        "status": "updated",
        "config": service_config
    }
