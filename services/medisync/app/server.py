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
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

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


# ======================================================================
# Lifespan — initialise the shared SimulationManager
# ======================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    mgr = SimulationManager()
    app.state.sim_manager = mgr
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
            # In container: checkpoints are at /app/checkpoints/
            container_ckpt = "/app/checkpoints"
            if os.path.isdir(container_ckpt):
                # Look for run subdirectories
                runs = sorted(
                    [d for d in os.listdir(container_ckpt)
                     if os.path.isdir(os.path.join(container_ckpt, d))],
                    reverse=True,
                )
                if runs:
                    checkpoint_dir = os.path.join(container_ckpt, runs[0])
                elif glob.glob(os.path.join(container_ckpt, "*_best.pt")):
                    # Checkpoints directly in the directory
                    checkpoint_dir = container_ckpt

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

    return app


app = create_app()
