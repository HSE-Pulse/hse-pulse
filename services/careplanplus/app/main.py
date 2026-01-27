"""
CarePlanPlus - Personalized Treatment Pathway Recommender
BERT-based procedure sequence prediction
"""

import os
import logging
import time
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any

import torch
import torch.nn as nn
import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pymongo import MongoClient
from sklearn.preprocessing import LabelEncoder
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

try:
    from transformers import BertModel, BertTokenizer
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s"}'
)
logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP request latency', ['method', 'endpoint'])
MODEL_INFERENCE_TIME = Histogram('model_inference_duration_seconds', 'Model inference latency')
MODEL_LOADED = Gauge('model_loaded', 'Whether the model is loaded')
RECOMMENDATIONS_TOTAL = Counter('recommendations_total', 'Total recommendations made')


class EfficientBERTRecommender(nn.Module):
    """BERT-based recommender model for procedure prediction."""

    def __init__(self, n_procedures: int, dropout: float = 0.3, freeze_layers: int = 6):
        super().__init__()

        if TRANSFORMERS_AVAILABLE:
            self.bert = BertModel.from_pretrained('bert-base-uncased')

            if freeze_layers > 0:
                for param in self.bert.embeddings.parameters():
                    param.requires_grad = False
                for i in range(min(freeze_layers, len(self.bert.encoder.layer))):
                    for param in self.bert.encoder.layer[i].parameters():
                        param.requires_grad = False

            hidden_size = self.bert.config.hidden_size
        else:
            self.bert = None
            hidden_size = 768

        self.bn = nn.BatchNorm1d(hidden_size)
        self.dropout = nn.Dropout(dropout)
        self.intermediate = nn.Linear(hidden_size, 256)
        self.classifier = nn.Linear(256, n_procedures)

        nn.init.xavier_uniform_(self.intermediate.weight)
        nn.init.xavier_uniform_(self.classifier.weight)

    def forward(self, input_ids: torch.Tensor, attention_mask: torch.Tensor) -> torch.Tensor:
        if self.bert is not None:
            outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
            x = self.bn(outputs.pooler_output)
        else:
            # Demo mode: random embeddings
            batch_size = input_ids.shape[0]
            x = torch.randn(batch_size, 768)
            x = self.bn(x)

        x = self.dropout(x)
        x = torch.relu(self.intermediate(x))
        x = self.dropout(x)
        return self.classifier(x)


# ICD-10-PCS Procedure Code Descriptions
PROCEDURE_DESCRIPTIONS = {
    # Respiratory System
    "0BH17ZZ": "Insertion of Radioactive Element into Trachea, Via Natural or Artificial Opening",
    "0BH18ZZ": "Insertion of Radioactive Element into Trachea, Via Natural or Artificial Opening Endoscopic",
    "0BN70ZZ": "Release Right Main Bronchus, Open Approach",
    "0BN74ZZ": "Release Right Main Bronchus, Percutaneous Endoscopic Approach",
    "0B110F4": "Bypass Trachea to Cutaneous with Tracheostomy Device, Open Approach",
    "0BW10FZ": "Revision of Tracheostomy Device in Trachea, Open Approach",
    # Cardiovascular System
    "02HV33Z": "Insertion of Infusion Device into Superior Vena Cava, Percutaneous Approach",
    "02H633Z": "Insertion of Infusion Device into Right Atrium, Percutaneous Approach",
    "02HK33Z": "Insertion of Infusion Device into Right Ventricle, Percutaneous Approach",
    "02703DZ": "Dilation of Coronary Artery, One Artery with Intraluminal Device, Percutaneous Approach",
    "02703ZZ": "Dilation of Coronary Artery, One Artery, Percutaneous Approach",
    "0270346": "Dilation of Coronary Artery, One Artery with Drug-eluting Intraluminal Device, Percutaneous Approach",
    "02100Z9": "Bypass Coronary Artery, One Artery from Left Internal Mammary, Open Approach",
    # Extracorporeal Assistance
    "5A1955Z": "Respiratory Ventilation, Greater than 96 Consecutive Hours",
    "5A1945Z": "Respiratory Ventilation, 24-96 Consecutive Hours",
    "5A1935Z": "Respiratory Ventilation, Less than 24 Consecutive Hours",
    "5A09357": "Assistance with Respiratory Ventilation, Less than 24 Consecutive Hours, Continuous Positive Airway Pressure",
    "5A1221Z": "Performance of Cardiac Output, Continuous, High Output",
    "5A2204Z": "Restoration of Cardiac Rhythm, Single",
    # Gastrointestinal System
    "0W9G3ZZ": "Drainage of Peritoneal Cavity, Percutaneous Approach",
    "0DB64ZZ": "Excision of Stomach, Percutaneous Endoscopic Approach",
    "0DQ60ZZ": "Repair Stomach, Open Approach",
    "0D160Z4": "Bypass Stomach to Cutaneous, Open Approach",
    "0DT60ZZ": "Resection of Stomach, Open Approach",
    "0DB68ZZ": "Excision of Stomach, Via Natural or Artificial Opening Endoscopic",
    # Administration
    "3E0G76Z": "Introduction of Nutritional Substance into Upper GI, Via Natural or Artificial Opening",
    "3E033VJ": "Introduction of Other Therapeutic Substance into Peripheral Vein, Percutaneous Approach",
    "3E0P7GC": "Introduction of Other Therapeutic Substance into Female Reproductive, Via Natural or Artificial Opening",
    "30233N1": "Transfusion of Nonautologous Red Blood Cells into Peripheral Vein, Percutaneous Approach",
    # Imaging/Diagnostic
    "BW03ZZZ": "Plain Radiography of Chest",
    "B5101ZZ": "Fluoroscopy of Heart, Right",
    "B21Y0ZZ": "Fluoroscopy of Coronary Arteries, Multiple",
    # Central Nervous System
    "00JU3ZZ": "Inspection of Spinal Canal, Percutaneous Approach",
    "009U3ZZ": "Drainage of Spinal Canal, Percutaneous Approach",
    # Urinary System
    "0T9B70Z": "Drainage of Bladder with Drainage Device, Via Natural or Artificial Opening",
    "0TJB8ZZ": "Inspection of Bladder, Via Natural or Artificial Opening Endoscopic",
}


class ModelManager:
    """Manages BERT model loading and inference."""

    def __init__(self):
        self.model: Optional[EfficientBERTRecommender] = None
        self.tokenizer = None
        self.procedure_encoder = LabelEncoder()
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.demo_mode = False
        self.demo_procedures = [
            "0BH17ZZ", "0BH18ZZ", "02HV33Z", "5A1955Z", "5A1945Z",
            "0W9G3ZZ", "0BN70ZZ", "0BN74ZZ", "3E0G76Z", "0DB64ZZ"
        ]
        self.procedure_descriptions = PROCEDURE_DESCRIPTIONS

    def load_model(self, model_path: str):
        """Load BERT recommender model from disk."""
        try:
            if TRANSFORMERS_AVAILABLE:
                self.tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')

            if os.path.exists(model_path):
                checkpoint = torch.load(model_path, map_location=self.device, weights_only=False)
                n_procedures = checkpoint.get('n_procedures', 100)
                self.model = EfficientBERTRecommender(n_procedures=n_procedures).to(self.device)
                self.model.load_state_dict(checkpoint['model_state_dict'])
                self.model.eval()

                if 'procedure_classes' in checkpoint:
                    self.procedure_encoder.classes_ = np.array(checkpoint['procedure_classes'])

                logger.info(f"Model loaded from {model_path}")
                MODEL_LOADED.set(1)
            else:
                logger.warning(f"Model file not found at {model_path}, using demo mode")
                self._create_demo_model()

        except Exception as e:
            logger.error(f"Error loading model: {e}")
            self._create_demo_model()

    def _create_demo_model(self):
        """Create a demo model for testing."""
        self.demo_mode = True
        self.procedure_encoder.fit(self.demo_procedures)
        n_procedures = len(self.demo_procedures)
        self.model = EfficientBERTRecommender(n_procedures=n_procedures).to(self.device)
        self.model.eval()
        MODEL_LOADED.set(0.5)
        logger.info("Demo model created")

    def predict(self, sequence_text: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Generate procedure recommendations."""
        if self.model is None:
            raise ValueError("Model not loaded")

        with MODEL_INFERENCE_TIME.time():
            if self.tokenizer is not None:
                encoding = self.tokenizer(
                    sequence_text,
                    truncation=True,
                    padding='max_length',
                    max_length=256,
                    return_tensors='pt'
                )
                input_ids = encoding['input_ids'].to(self.device)
                attention_mask = encoding['attention_mask'].to(self.device)
            else:
                # Demo mode
                input_ids = torch.randint(0, 30522, (1, 256)).to(self.device)
                attention_mask = torch.ones(1, 256).to(self.device)

            self.model.eval()
            with torch.no_grad():
                outputs = self.model(input_ids, attention_mask)
                probabilities = torch.softmax(outputs, dim=1)
                top_probs, top_indices = torch.topk(probabilities, k=min(top_k, probabilities.shape[1]))

            recommendations = []
            for prob, idx in zip(top_probs[0], top_indices[0]):
                try:
                    procedure_code = self.procedure_encoder.inverse_transform([idx.item()])[0]
                except:
                    procedure_code = self.demo_procedures[idx.item() % len(self.demo_procedures)]

                # Get procedure description
                description = self.procedure_descriptions.get(
                    procedure_code,
                    f"ICD-10-PCS Procedure {procedure_code}"
                )

                recommendations.append({
                    'procedure_code': procedure_code,
                    'procedure_description': description,
                    'confidence': round(prob.item(), 4),
                    'rank': len(recommendations) + 1
                })

            RECOMMENDATIONS_TOTAL.inc()
            return recommendations


# Global instances
model_manager = ModelManager()
mongo_client: Optional[MongoClient] = None
db = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global mongo_client, db

    logger.info("Starting CarePlanPlus service...")

    # Load model
    model_path = os.getenv("MODEL_PATH", "/app/models/bert_model.pth")
    model_manager.load_model(model_path)

    # Connect to MongoDB
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    try:
        mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        mongo_client.admin.command('ping')
        db = mongo_client[os.getenv("MONGO_DB", "recommender_system")]
        logger.info("Connected to MongoDB")
    except Exception as e:
        logger.warning(f"MongoDB connection failed: {e}. Using demo data.")
        db = None

    yield

    if mongo_client:
        mongo_client.close()
    logger.info("CarePlanPlus service stopped")


app = FastAPI(
    title="CarePlanPlus",
    description="Personalized treatment pathway recommender using BERT",
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
class Diagnosis(BaseModel):
    """Diagnosis information."""
    icd_code: str = Field(..., description="ICD code", example="I10")
    seq_num: int = Field(default=1, description="Sequence number")
    long_title: Optional[str] = Field(None, description="Diagnosis description", example="Essential hypertension")


class RecommendationRequest(BaseModel):
    """Request model for pathway recommendation."""
    diagnoses: List[Diagnosis] = Field(..., description="List of diagnoses")
    procedure_history: Optional[List[str]] = Field(None, description="Previous procedures")
    patient_age: Optional[int] = Field(None, ge=0, le=120, description="Patient age")
    patient_gender: Optional[str] = Field(None, description="Patient gender (M/F)")
    top_k: int = Field(default=5, ge=1, le=10, description="Number of recommendations")


class RecommendedProcedure(BaseModel):
    """Single procedure recommendation."""
    procedure_code: str
    procedure_description: Optional[str] = None
    confidence: float
    rank: int


class PathwayStep(BaseModel):
    """Step in a treatment pathway."""
    step_number: int
    procedure_code: str
    procedure_description: Optional[str] = None
    confidence: float


class RecommendationResponse(BaseModel):
    """Response model for pathway recommendation."""
    recommendations: List[RecommendedProcedure]
    full_pathway: Optional[List[PathwayStep]] = None
    model_version: str = "1.0.0"
    inference_time_ms: float


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    model_loaded: bool
    database_connected: bool
    demo_mode: bool
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
        demo_mode=model_manager.demo_mode,
        timestamp=datetime.utcnow().isoformat()
    )


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/predict", response_model=RecommendationResponse)
async def predict_next_procedure(request: RecommendationRequest):
    """
    Predict next recommended procedure based on diagnoses and history.

    Uses BERT model to analyze diagnosis sequence and recommend
    appropriate treatment procedures.
    """
    start_time = time.time()

    try:
        # Build sequence text
        diag_parts = [
            f"DIAG_{diag.seq_num}:{diag.icd_code}:{diag.long_title or ''}"
            for diag in sorted(request.diagnoses, key=lambda d: d.seq_num)
        ]
        sequence_text = " [SEP] ".join(diag_parts)

        if request.procedure_history:
            proc_parts = [f"PROC_{i+1}:{proc}" for i, proc in enumerate(request.procedure_history)]
            sequence_text += " [SEP] " + " [SEP] ".join(proc_parts)

        # Get recommendations
        recommendations = model_manager.predict(sequence_text, request.top_k)

        inference_time = (time.time() - start_time) * 1000

        return RecommendationResponse(
            recommendations=[RecommendedProcedure(**r) for r in recommendations],
            model_version="1.0.0",
            inference_time_ms=round(inference_time, 2)
        )

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/pathway", response_model=RecommendationResponse)
async def recommend_full_pathway(request: RecommendationRequest):
    """
    Recommend a full treatment pathway (sequence of procedures).

    Iteratively predicts procedures to build a complete pathway.
    """
    start_time = time.time()

    try:
        pathway = []
        current_procedures = list(request.procedure_history or [])
        max_steps = 5

        for step in range(max_steps):
            # Build sequence text
            diag_parts = [
                f"DIAG_{diag.seq_num}:{diag.icd_code}:{diag.long_title or ''}"
                for diag in sorted(request.diagnoses, key=lambda d: d.seq_num)
            ]
            sequence_text = " [SEP] ".join(diag_parts)

            if current_procedures:
                proc_parts = [f"PROC_{i+1}:{proc}" for i, proc in enumerate(current_procedures)]
                sequence_text += " [SEP] " + " [SEP] ".join(proc_parts)

            recommendations = model_manager.predict(sequence_text, top_k=1)
            if not recommendations:
                break

            best = recommendations[0]
            pathway.append(PathwayStep(
                step_number=step + 1,
                procedure_code=best['procedure_code'],
                procedure_description=best.get('procedure_description'),
                confidence=best['confidence']
            ))
            current_procedures.append(best['procedure_code'])

        inference_time = (time.time() - start_time) * 1000

        return RecommendationResponse(
            recommendations=[],
            full_pathway=pathway,
            model_version="1.0.0",
            inference_time_ms=round(inference_time, 2)
        )

    except Exception as e:
        logger.error(f"Pathway generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sample-diagnoses")
async def get_sample_diagnoses():
    """Get sample diagnoses for demo purposes."""
    return {
        "samples": [
            {
                "name": "Cardiovascular Case",
                "diagnoses": [
                    {"icd_code": "I10", "seq_num": 1, "long_title": "Essential hypertension"},
                    {"icd_code": "I25.10", "seq_num": 2, "long_title": "Atherosclerotic heart disease"}
                ]
            },
            {
                "name": "Respiratory Case",
                "diagnoses": [
                    {"icd_code": "J44.1", "seq_num": 1, "long_title": "Chronic obstructive pulmonary disease with acute exacerbation"},
                    {"icd_code": "J96.01", "seq_num": 2, "long_title": "Acute respiratory failure with hypoxia"}
                ]
            },
            {
                "name": "Gastrointestinal Case",
                "diagnoses": [
                    {"icd_code": "K92.2", "seq_num": 1, "long_title": "Gastrointestinal hemorrhage"},
                    {"icd_code": "K25.4", "seq_num": 2, "long_title": "Chronic gastric ulcer with hemorrhage"}
                ]
            }
        ]
    }


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "service": "CarePlanPlus",
        "description": "Personalized Treatment Pathway Recommender",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "metrics": "/metrics"
    }
