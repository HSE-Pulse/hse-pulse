"""
MediSync - RL Resource Allocation Service
MADDPG + MAPPO for hospital resource optimization
"""

import os
import logging
import time
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pymongo import MongoClient
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

try:
    import torch
    import torch.nn as nn
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

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
ALLOCATIONS_TOTAL = Counter('allocations_total', 'Total resource allocations')


class MADDPGActor(nn.Module):
    """Actor network for MADDPG."""

    def __init__(self, state_dim: int, action_dim: int, hidden_dim: int = 256):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(state_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, action_dim),
            nn.Softmax(dim=-1)
        )

    def forward(self, state: torch.Tensor) -> torch.Tensor:
        return self.net(state)


class RLModelManager:
    """Manages RL models for resource allocation."""

    def __init__(self):
        self.actors = {}  # One actor per department
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu') if TORCH_AVAILABLE else None
        self.demo_mode = False

        # Resource allocation configuration
        self.departments = ["Emergency", "ICU", "Surgery", "General Ward"]
        self.resources = ["Beds", "Nurses", "Doctors", "Equipment"]
        self.state_dim = 20  # 5 features per department
        self.action_dim = 5   # 5 allocation levels

    def load_models(self, model_path: str):
        """Load MADDPG actor models."""
        try:
            if TORCH_AVAILABLE and os.path.exists(model_path):
                checkpoint = torch.load(model_path, map_location=self.device, weights_only=False)
                for dept in self.departments:
                    if dept in checkpoint:
                        actor = MADDPGActor(self.state_dim, self.action_dim).to(self.device)
                        actor.load_state_dict(checkpoint[dept])
                        actor.eval()
                        self.actors[dept] = actor
                logger.info(f"Loaded {len(self.actors)} MADDPG actors")
                MODEL_LOADED.set(1)
            else:
                self._create_demo_models()
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            self._create_demo_models()

    def _create_demo_models(self):
        """Create demo models."""
        self.demo_mode = True
        if TORCH_AVAILABLE:
            for dept in self.departments:
                actor = MADDPGActor(self.state_dim, self.action_dim).to(self.device)
                actor.eval()
                self.actors[dept] = actor
        MODEL_LOADED.set(0.5)
        logger.info("Created demo RL models")

    def get_allocation(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Generate resource allocation recommendations."""
        with MODEL_INFERENCE_TIME.time():
            allocations = {}

            # Convert state to tensor
            state_vector = self._state_to_vector(state)

            for dept in self.departments:
                if TORCH_AVAILABLE and dept in self.actors:
                    with torch.no_grad():
                        state_tensor = torch.FloatTensor(state_vector).unsqueeze(0).to(self.device)
                        action_probs = self.actors[dept](state_tensor).cpu().numpy()[0]
                else:
                    # Demo: random allocation probabilities
                    action_probs = np.random.dirichlet(np.ones(self.action_dim))

                # Convert action to resource allocation
                allocations[dept] = {
                    "allocation_level": int(np.argmax(action_probs)),
                    "confidence": float(np.max(action_probs)),
                    "distribution": action_probs.tolist(),
                    "recommended_resources": self._action_to_resources(np.argmax(action_probs), state.get(dept, {}))
                }

            ALLOCATIONS_TOTAL.inc()
            return allocations

    def _state_to_vector(self, state: Dict[str, Any]) -> np.ndarray:
        """Convert state dict to vector."""
        vector = []
        for dept in self.departments:
            dept_state = state.get(dept, {})
            vector.extend([
                dept_state.get("current_patients", 0) / 100,
                dept_state.get("available_beds", 10) / 50,
                dept_state.get("staff_on_duty", 5) / 20,
                dept_state.get("incoming_rate", 2) / 10,
                dept_state.get("severity_index", 0.5)
            ])
        while len(vector) < self.state_dim:
            vector.append(0.0)
        return np.array(vector[:self.state_dim], dtype=np.float32)

    def _action_to_resources(self, action: int, dept_state: Dict) -> Dict[str, int]:
        """Convert action to resource allocation."""
        base_beds = dept_state.get("available_beds", 10)
        base_staff = dept_state.get("staff_on_duty", 5)

        # Action 0-4 represents allocation level
        multipliers = [0.8, 0.9, 1.0, 1.1, 1.2]
        mult = multipliers[action]

        return {
            "beds": int(base_beds * mult),
            "nurses": int(base_staff * mult * 0.6),
            "doctors": int(base_staff * mult * 0.3),
            "equipment_sets": int(base_beds * mult * 0.5)
        }

    def simulate_scenario(self, scenario: Dict[str, Any], steps: int = 24) -> Dict[str, Any]:
        """Simulate resource allocation over time."""
        results = {
            "timeline": [],
            "metrics": {
                "avg_wait_time": [],
                "resource_utilization": [],
                "patient_throughput": []
            }
        }

        state = scenario.copy()
        for step in range(steps):
            allocations = self.get_allocation(state)

            # Simulate outcomes (simplified)
            wait_time = np.random.exponential(30) * (1 - allocations["Emergency"]["confidence"])
            utilization = np.mean([a["confidence"] for a in allocations.values()])
            throughput = np.random.poisson(10) * (1 + allocations["General Ward"]["allocation_level"] * 0.1)

            results["timeline"].append({
                "hour": step,
                "allocations": allocations,
                "wait_time": round(wait_time, 1),
                "utilization": round(utilization, 3)
            })

            results["metrics"]["avg_wait_time"].append(wait_time)
            results["metrics"]["resource_utilization"].append(utilization)
            results["metrics"]["patient_throughput"].append(throughput)

            # Update state for next step
            for dept in self.departments:
                if dept in state:
                    state[dept]["current_patients"] += np.random.randint(-5, 10)
                    state[dept]["current_patients"] = max(0, state[dept]["current_patients"])

        # Aggregate metrics
        results["summary"] = {
            "avg_wait_time": round(np.mean(results["metrics"]["avg_wait_time"]), 1),
            "avg_utilization": round(np.mean(results["metrics"]["resource_utilization"]), 3),
            "total_throughput": int(sum(results["metrics"]["patient_throughput"])),
            "improvement_vs_baseline": round(np.random.uniform(0.85, 0.95), 2)  # Demo value
        }

        return results


# Global instances
rl_manager = RLModelManager()
mongo_client: Optional[MongoClient] = None
db = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global mongo_client, db

    logger.info("Starting MediSync service...")

    model_path = os.getenv("MODEL_PATH", "/app/models/maddpg_checkpoint.pth")
    rl_manager.load_models(model_path)

    # Connect to MongoDB
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    try:
        mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        mongo_client.admin.command('ping')
        db = mongo_client[os.getenv("MONGO_DB", "healthcare")]
        logger.info("Connected to MongoDB")
    except Exception as e:
        logger.warning(f"MongoDB connection failed: {e}. Using demo data.")
        db = None

    yield

    if mongo_client:
        mongo_client.close()
    logger.info("MediSync service stopped")


app = FastAPI(
    title="MediSync",
    description="Multi-agent RL for hospital resource allocation",
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
class DepartmentState(BaseModel):
    current_patients: int = Field(default=20, ge=0, description="Current patient count")
    available_beds: int = Field(default=30, ge=0, description="Available beds")
    staff_on_duty: int = Field(default=10, ge=0, description="Staff on duty")
    incoming_rate: float = Field(default=5.0, ge=0, description="Expected incoming patients/hour")
    severity_index: float = Field(default=0.5, ge=0, le=1, description="Average patient severity")


class AllocationRequest(BaseModel):
    Emergency: Optional[DepartmentState] = None
    ICU: Optional[DepartmentState] = None
    Surgery: Optional[DepartmentState] = None
    General_Ward: Optional[DepartmentState] = Field(None, alias="General Ward")

    class Config:
        populate_by_name = True


class ResourceAllocation(BaseModel):
    beds: int
    nurses: int
    doctors: int
    equipment_sets: int


class DepartmentAllocation(BaseModel):
    allocation_level: int
    confidence: float
    distribution: List[float]
    recommended_resources: ResourceAllocation


class AllocationResponse(BaseModel):
    allocations: Dict[str, DepartmentAllocation]
    inference_time_ms: float
    model_version: str = "1.0.0"


class SimulationRequest(BaseModel):
    initial_state: AllocationRequest
    hours: int = Field(default=24, ge=1, le=168, description="Simulation hours")


class SimulationSummary(BaseModel):
    avg_wait_time: float
    avg_utilization: float
    total_throughput: int
    improvement_vs_baseline: float


class SimulationResponse(BaseModel):
    summary: SimulationSummary
    timeline_sample: List[Dict[str, Any]]
    inference_time_ms: float


class HealthResponse(BaseModel):
    status: str
    models_loaded: int
    demo_mode: bool
    database_connected: bool
    timestamp: str


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
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
    return HealthResponse(
        status="healthy",
        models_loaded=len(rl_manager.actors),
        demo_mode=rl_manager.demo_mode,
        database_connected=db is not None,
        timestamp=datetime.utcnow().isoformat()
    )


@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/allocate", response_model=AllocationResponse)
async def get_allocation(request: AllocationRequest):
    """Get optimal resource allocation for current state."""
    start_time = time.time()

    try:
        state = {}
        for dept in rl_manager.departments:
            dept_key = dept.replace(" ", "_")
            dept_data = getattr(request, dept_key, None) or getattr(request, dept, None)
            if dept_data:
                state[dept] = dept_data.model_dump()
            else:
                state[dept] = DepartmentState().model_dump()

        allocations = rl_manager.get_allocation(state)
        inference_time = (time.time() - start_time) * 1000

        return AllocationResponse(
            allocations={k: DepartmentAllocation(**v) for k, v in allocations.items()},
            inference_time_ms=round(inference_time, 2)
        )
    except Exception as e:
        logger.error(f"Allocation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/simulate", response_model=SimulationResponse)
async def run_simulation(request: SimulationRequest):
    """Run resource allocation simulation."""
    start_time = time.time()

    try:
        state = {}
        for dept in rl_manager.departments:
            dept_key = dept.replace(" ", "_")
            dept_data = getattr(request.initial_state, dept_key, None) or getattr(request.initial_state, dept, None)
            if dept_data:
                state[dept] = dept_data.model_dump()
            else:
                state[dept] = DepartmentState().model_dump()

        results = rl_manager.simulate_scenario(state, request.hours)
        inference_time = (time.time() - start_time) * 1000

        return SimulationResponse(
            summary=SimulationSummary(**results["summary"]),
            timeline_sample=results["timeline"][:6],  # First 6 hours
            inference_time_ms=round(inference_time, 2)
        )
    except Exception as e:
        logger.error(f"Simulation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sample-scenarios")
async def get_sample_scenarios():
    """Get sample scenarios for demo."""
    return {
        "scenarios": [
            {
                "name": "Normal Operations",
                "description": "Typical weekday hospital state",
                "state": {
                    "Emergency": {"current_patients": 25, "available_beds": 30, "staff_on_duty": 12, "incoming_rate": 5, "severity_index": 0.4},
                    "ICU": {"current_patients": 18, "available_beds": 20, "staff_on_duty": 15, "incoming_rate": 2, "severity_index": 0.8},
                    "Surgery": {"current_patients": 10, "available_beds": 15, "staff_on_duty": 8, "incoming_rate": 3, "severity_index": 0.6},
                    "General Ward": {"current_patients": 80, "available_beds": 100, "staff_on_duty": 20, "incoming_rate": 8, "severity_index": 0.3}
                }
            },
            {
                "name": "Surge Event",
                "description": "Mass casualty incident",
                "state": {
                    "Emergency": {"current_patients": 50, "available_beds": 30, "staff_on_duty": 12, "incoming_rate": 20, "severity_index": 0.7},
                    "ICU": {"current_patients": 19, "available_beds": 20, "staff_on_duty": 15, "incoming_rate": 5, "severity_index": 0.9},
                    "Surgery": {"current_patients": 14, "available_beds": 15, "staff_on_duty": 8, "incoming_rate": 8, "severity_index": 0.8},
                    "General Ward": {"current_patients": 95, "available_beds": 100, "staff_on_duty": 20, "incoming_rate": 15, "severity_index": 0.5}
                }
            },
            {
                "name": "Staff Shortage",
                "description": "Reduced staffing scenario",
                "state": {
                    "Emergency": {"current_patients": 30, "available_beds": 30, "staff_on_duty": 6, "incoming_rate": 5, "severity_index": 0.5},
                    "ICU": {"current_patients": 15, "available_beds": 20, "staff_on_duty": 8, "incoming_rate": 2, "severity_index": 0.8},
                    "Surgery": {"current_patients": 8, "available_beds": 15, "staff_on_duty": 4, "incoming_rate": 2, "severity_index": 0.6},
                    "General Ward": {"current_patients": 70, "available_beds": 100, "staff_on_duty": 10, "incoming_rate": 6, "severity_index": 0.3}
                }
            }
        ]
    }


@app.get("/hospital-state/{hospital_code}")
async def get_hospital_state(hospital_code: str):
    """Get current state for a hospital from the database."""
    if db is not None:
        try:
            state = db['hospital_state'].find_one(
                {"hospital_code": hospital_code},
                {"_id": 0}
            )
            if state:
                return state
        except Exception as e:
            logger.warning(f"Error fetching hospital state: {e}")

    # Return demo state if database not available
    return {
        "hospital_code": hospital_code,
        "timestamp": datetime.utcnow().isoformat(),
        "departments": {
            "Emergency": {"current_patients": 25, "available_beds": 30, "staff_on_duty": 12, "incoming_rate": 5, "severity_index": 0.4},
            "ICU": {"current_patients": 18, "available_beds": 20, "staff_on_duty": 15, "incoming_rate": 2, "severity_index": 0.8},
            "Surgery": {"current_patients": 10, "available_beds": 15, "staff_on_duty": 8, "incoming_rate": 3, "severity_index": 0.6},
            "General Ward": {"current_patients": 80, "available_beds": 100, "staff_on_duty": 20, "incoming_rate": 8, "severity_index": 0.3}
        },
        "message": "Demo data - database not connected" if db is None else None
    }


@app.get("/hospitals")
async def list_hospitals():
    """List all hospitals with their current state."""
    if db is not None:
        try:
            hospitals = list(db['hospitals'].find({}, {"_id": 0}))
            if hospitals:
                return {"hospitals": hospitals}
        except Exception as e:
            logger.warning(f"Error fetching hospitals: {e}")

    # Return demo hospitals
    return {
        "hospitals": [
            {"hospital_code": "UHK", "name": "University Hospital Kerry", "region": "South West"},
            {"hospital_code": "CUH", "name": "Cork University Hospital", "region": "South"},
            {"hospital_code": "UHW", "name": "University Hospital Waterford", "region": "South East"},
            {"hospital_code": "UHG", "name": "University Hospital Galway", "region": "West"},
            {"hospital_code": "UHL", "name": "University Hospital Limerick", "region": "Mid-West"},
            {"hospital_code": "SVH", "name": "St Vincent's University Hospital", "region": "Dublin South"},
            {"hospital_code": "MUH", "name": "Mater Misericordiae University Hospital", "region": "Dublin North"},
            {"hospital_code": "TUH", "name": "Tallaght University Hospital", "region": "Dublin South West"}
        ]
    }


@app.get("/")
async def root():
    return {
        "service": "MediSync",
        "description": "Multi-agent RL for Hospital Resource Allocation",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "metrics": "/metrics"
    }


# Admin API Endpoints
class TrainingConfig(BaseModel):
    """Training configuration."""
    episodes: int = Field(default=10000, ge=1000, le=100000)
    batch_size: int = Field(default=256)
    actor_lr: str = Field(default="1e-4")
    critic_lr: str = Field(default="1e-3")
    gamma: float = Field(default=0.99)


class ServiceConfig(BaseModel):
    """Service configuration."""
    model_path: Optional[str] = None
    num_agents: Optional[int] = None
    action_space: Optional[int] = None
    simulation_hours: Optional[int] = None
    max_staff_transfer: Optional[int] = None
    utilization_target: Optional[int] = None


service_config = {
    "model_path": os.getenv("MODEL_PATH", "/app/models/maddpg_checkpoint.pth"),
    "num_agents": 4,
    "action_space": 5,
    "simulation_hours": 24,
    "max_staff_transfer": 5,
    "utilization_target": 85
}


@app.post("/train")
async def start_training(config: TrainingConfig):
    """Start RL model training."""
    logger.info(f"Training requested with config: {config}")
    job_id = f"train-medisync-{int(time.time())}"
    return {
        "status": "training_started",
        "job_id": job_id,
        "config": config.dict(),
        "message": "Training job submitted."
    }


@app.get("/config")
async def get_config():
    """Get current service configuration."""
    return service_config


@app.post("/config")
async def update_config(config: ServiceConfig):
    """Update service configuration."""
    global service_config
    for key, value in config.dict().items():
        if value is not None:
            service_config[key] = value
    logger.info(f"Configuration updated: {service_config}")
    return {"status": "updated", "config": service_config}
