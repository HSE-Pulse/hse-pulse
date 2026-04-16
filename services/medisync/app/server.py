"""
MediSync API — FastAPI entry point.

    uvicorn app.server:app --host 0.0.0.0 --port 8000

Endpoints:
    POST  /start          — begin a new 7-day episode
    POST  /pause          — pause / resume toggle
    POST  /reset          — stop and reset to step 0
    POST  /config/update  — change env params at runtime
    POST  /policy/select  — switch MADDPG / MAPPO / baseline
    GET   /health         — liveness check
    GET   /state          — current snapshot + status
    GET   /metrics/history — smoothed time-series
    WS    /stream/metrics — live per-step DES metrics
"""

from __future__ import annotations

import glob
import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.responses import Response
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
import mlflow

from app.simulation import SimulationManager
from app.schemas import (
    StartRequest,
    SimStatus,
    PolicySelectRequest,
    ConfigUpdateRequest,
    PolicyMode,
    SimState,
    StaffingOverride,
    ParamUpdate,
    MetricsHistory,
)

# Backward-compat routers
from app.routes_sim import router as sim_router
from app.routes_control import router as control_router
from app.ws import router as ws_legacy_router
from app.websocket import router as ws_metrics_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("medisync.server")

# Prometheus metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP request latency', ['method', 'endpoint'])
MODEL_INFERENCE_TIME = Histogram('model_inference_duration_seconds', 'Model inference latency')
MODEL_LOADED = Gauge('model_loaded', 'Whether the model is loaded')
ALLOCATIONS_TOTAL = Counter('allocations_total', 'Total resource allocations')
SIMULATION_STEPS = Counter('simulation_steps_total', 'Total simulation steps')


# ======================================================================
# Lifespan — initialise the shared SimulationManager
# ======================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    mgr = SimulationManager()
    app.state.sim_manager = mgr
    MODEL_LOADED.set(1)
    logger.info("SimulationManager initialised.")
    yield
    await mgr.stop()
    logger.info("SimulationManager shut down.")


# ======================================================================
# App factory
# ======================================================================

def create_app() -> FastAPI:
    app = FastAPI(
        title="MediSync API",
        description=(
            "Interactive hospital DES driven by multi-agent RL.\n\n"
            "- **DES engine**: hospital_env.py (untouched)\n"
            "- **MARL inference**: maddpg.py / mappo.py (weights frozen)\n"
            "- **UI**: served separately from ui/ directory"
        ),
        version="2.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def metrics_middleware(request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=request.url.path,
            status=response.status_code,
        ).inc()
        REQUEST_LATENCY.labels(
            method=request.method,
            endpoint=request.url.path,
        ).observe(duration)
        return response

    # ----- backward-compat routers (/sim/*, /control/*, /ws/simulation) -----
    app.include_router(sim_router)
    app.include_router(control_router)
    app.include_router(ws_legacy_router)

    # ----- new metrics WebSocket (/stream/metrics) -----
    app.include_router(ws_metrics_router)

    # ==================================================================
    # PRIMARY ENDPOINTS (flat namespace)
    # ==================================================================

    def _mgr(request: Request) -> SimulationManager:
        return request.app.state.sim_manager

    # --- Health ---

    @app.get("/health", tags=["health"])
    async def health():
        return {"status": "ok"}

    # --- GET /metrics ---

    @app.get("/metrics", tags=["metrics"])
    async def metrics():
        return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

    # --- POST /start ---

    @app.post("/start", response_model=SimStatus, tags=["simulation"])
    async def start(body: StartRequest, request: Request):
        mgr = _mgr(request)

        if mgr.state in (SimState.RUNNING, SimState.PAUSED):
            raise HTTPException(400, "Simulation already running. POST /reset first.")

        mgr.seed = body.seed
        count = mgr.load_data(
            data_dir=body.data_dir,
            max_patients=body.max_patients,
            use_synthetic=body.use_synthetic,
            synthetic_patients=body.synthetic_patients,
        )
        if count == 0:
            raise HTTPException(400, "No admissions loaded.")

        mgr.create_env(episode_hours=body.episode_hours, seed=body.seed)

        # Auto-detect latest checkpoint directory
        checkpoint_dir = body.checkpoint_dir
        if checkpoint_dir is None:
            # Search candidate dirs: container path + local dev path
            for candidate in ["/app/checkpoints", "./checkpoints"]:
                if os.path.isdir(candidate):
                    # Look for run subdirectories
                    runs = sorted(
                        [d for d in os.listdir(candidate)
                         if os.path.isdir(os.path.join(candidate, d))],
                        reverse=True,
                    )
                    if runs:
                        checkpoint_dir = os.path.join(candidate, runs[0])
                        break
                    elif glob.glob(os.path.join(candidate, "*_best.pt")):
                        checkpoint_dir = candidate
                        break

        if checkpoint_dir and os.path.isdir(checkpoint_dir):
            loaded = mgr.load_checkpoints(checkpoint_dir)
            logger.info("Checkpoints loaded: %s", loaded)
        else:
            logger.warning("No checkpoint dir found — only BASELINE policy available.")

        # Map AlgoName → PolicyMode for backward compat
        mgr.active_policy = PolicyMode(body.algo.value)
        mgr.deterministic = body.deterministic
        mgr.speed = body.speed

        await mgr.start()

        ALLOCATIONS_TOTAL.inc()

        # Log simulation run to MLflow (non-blocking)
        def _log_mlflow():
            mlflow_uri = os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")
            experiment_name = os.getenv("MLFLOW_EXPERIMENT_NAME", "medisync")
            try:
                mlflow.set_tracking_uri(mlflow_uri)
                mlflow.set_experiment(experiment_name)
                with mlflow.start_run(run_name=f"sim-{int(time.time())}"):
                    mlflow.log_params({
                        "episode_hours": body.episode_hours,
                        "seed": body.seed,
                        "algo": body.algo.value,
                        "deterministic": body.deterministic,
                        "speed": body.speed,
                        "max_patients": body.max_patients,
                        "use_synthetic": body.use_synthetic,
                    })
                    mlflow.log_metrics({
                        "patients_loaded": count,
                        "status": 1,
                    })
                    mlflow.set_tags({
                        "service": "medisync",
                        "policy": body.algo.value,
                        "status": "started",
                    })
                logger.info("MLflow run logged for simulation start")
            except Exception as e:
                logger.warning("MLflow logging failed: %s", e)

        import threading
        threading.Thread(target=_log_mlflow, daemon=True).start()

        return SimStatus(**mgr.get_status())

    # --- POST /pause ---

    @app.post("/pause", tags=["simulation"])
    async def pause(request: Request):
        mgr = _mgr(request)
        if mgr.state == SimState.RUNNING:
            mgr.pause()
        elif mgr.state == SimState.PAUSED:
            mgr.resume()
        else:
            raise HTTPException(400, f"Cannot pause/resume in state: {mgr.state.value}")
        return {"state": mgr.state.value}

    # --- POST /reset ---

    @app.post("/reset", response_model=SimStatus, tags=["simulation"])
    async def reset(request: Request):
        mgr = _mgr(request)
        await mgr.reset()
        return SimStatus(**mgr.get_status())

    # --- POST /config/update ---

    @app.post("/config/update", tags=["configuration"])
    async def config_update(body: ConfigUpdateRequest, request: Request):
        mgr = _mgr(request)
        if mgr.env is None:
            raise HTTPException(400, "Environment not initialised. POST /start first.")

        if body.speed is not None:
            mgr.set_speed(body.speed)

        if body.seed is not None:
            mgr.seed = body.seed

        paused = mgr.state in (SimState.PAUSED, SimState.IDLE, SimState.DONE)

        if paused:
            if body.stage is not None:
                from app.config import CURRICULUM_STAGES as _STAGES
                idx = max(1, min(5, body.stage)) - 1
                mgr.env.set_stage(_STAGES[idx])
                mgr._stage_index = idx + 1
                mgr._stage_name = _STAGES[idx].name

            if body.arrival_rate_multiplier is not None:
                mgr.env.arrival_rate_multiplier = body.arrival_rate_multiplier

            if body.staffing:
                for dept, roles in body.staffing.items():
                    if dept in mgr.env.staff:
                        for role, val in roles.items():
                            if role in mgr.env.staff[dept]:
                                from app.config import MIN_STAFF, MAX_STAFF
                                mgr.env.staff[dept][role] = max(
                                    MIN_STAFF.get(role, 0),
                                    min(MAX_STAFF.get(role, 99), int(val)),
                                )

            if body.capacity:
                for dept, cap in body.capacity.items():
                    if dept in mgr.env.capacity:
                        mgr.env.capacity[dept] = max(1, int(cap))

            if body.base_service_time:
                for dept, svc in body.base_service_time.items():
                    if dept in mgr.env.base_service:
                        mgr.env.base_service[dept] = max(1.0, float(svc))
        else:
            if body.stage is not None:
                await mgr.set_stage(body.stage)

            staffing_overrides = None
            if body.staffing:
                staffing_overrides = [
                    StaffingOverride(department=dept, **roles)
                    for dept, roles in body.staffing.items()
                ]

            param_update = ParamUpdate(
                arrival_rate_multiplier=body.arrival_rate_multiplier,
                staffing=staffing_overrides,
                capacity=body.capacity,
                base_service_time=body.base_service_time,
            )
            await mgr.update_params(param_update)

        return mgr.get_current_params()

    # --- POST /policy/select ---

    @app.post("/policy/select", tags=["policy"])
    async def policy_select(body: PolicySelectRequest, request: Request):
        mgr = _mgr(request)
        await mgr.switch_policy(body.policy)
        mgr.toggle_sampling(body.deterministic)
        return {
            "policy": mgr.active_policy.value,
            "deterministic": mgr.deterministic,
        }

    # --- GET /state ---

    @app.get("/state", tags=["simulation"])
    async def state(request: Request):
        mgr = _mgr(request)
        snapshot = mgr.get_current_snapshot()
        return {
            "status": mgr.get_status(),
            "snapshot": snapshot.model_dump() if snapshot else None,
        }

    # --- GET /metrics/history ---

    @app.get("/metrics/history", response_model=MetricsHistory, tags=["metrics"])
    async def metrics_history(request: Request, window: int = 12):
        mgr = _mgr(request)
        return mgr.get_metrics_history(window=window)

    # --- Static UI serving ---
    static_dir = Path("/app/static")
    if static_dir.exists():
        # Serve static assets
        app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")

        @app.get("/", tags=["ui"])
        async def serve_ui():
            return FileResponse(static_dir / "index.html")

        @app.get("/{path:path}", tags=["ui"])
        async def serve_spa(path: str):
            # Exclude API paths from SPA routing
            api_paths = ['metrics', 'health', 'state', 'start', 'pause', 'reset', 'config', 'policy', 'stream']
            if path.split('/')[0] in api_paths:
                raise HTTPException(status_code=404, detail="Not found")
            # Serve index.html for SPA routes
            file_path = static_dir / path
            if file_path.exists() and file_path.is_file():
                return FileResponse(file_path)
            return FileResponse(static_dir / "index.html")

    return app


app = create_app()
