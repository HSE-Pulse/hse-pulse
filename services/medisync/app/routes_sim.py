from __future__ import annotations

import glob
import os

from fastapi import APIRouter, HTTPException, Request

from app.schemas import (
    StartRequest,
    SimStatus,
    TickSnapshot,
    CheckpointInfo,
    SimState,
)

router = APIRouter(prefix="/sim", tags=["simulation"])


def _get_manager(request: Request):
    return request.app.state.sim_manager


@router.post("/start", response_model=SimStatus)
async def start_simulation(body: StartRequest, request: Request):
    mgr = _get_manager(request)

    if mgr.state in (SimState.RUNNING, SimState.PAUSED):
        raise HTTPException(400, "Simulation already running. POST /sim/stop first.")

    # Load data
    mgr.seed = body.seed
    count = mgr.load_data(
        data_dir=body.data_dir,
        max_patients=body.max_patients,
        use_synthetic=body.use_synthetic,
        synthetic_patients=body.synthetic_patients,
    )
    if count == 0:
        raise HTTPException(400, "No admissions loaded from data source.")

    # Create environment
    mgr.create_env(episode_hours=body.episode_hours, seed=body.seed)

    # Load checkpoints
    checkpoint_dir = body.checkpoint_dir
    if checkpoint_dir is None:
        # Auto-detect: look in /app/checkpoints/ (container path)
        output_base = "/app/checkpoints"
        if os.path.isdir(output_base):
            runs = sorted(
                [d for d in os.listdir(output_base) if os.path.isdir(os.path.join(output_base, d))],
                reverse=True,
            )
            if runs:
                checkpoint_dir = os.path.join(output_base, runs[0])
            elif glob.glob(os.path.join(output_base, "*_best.pt")):
                checkpoint_dir = output_base

    if checkpoint_dir is None or not os.path.isdir(checkpoint_dir):
        raise HTTPException(400, f"No checkpoint directory found: {checkpoint_dir}")

    loaded = mgr.load_checkpoints(checkpoint_dir)
    if not loaded:
        raise HTTPException(400, f"No *_best.pt checkpoints found in {checkpoint_dir}")

    # Apply initial settings
    mgr.active_algo = body.algo
    mgr.deterministic = body.deterministic
    mgr.speed = body.speed

    await mgr.start()
    return SimStatus(**mgr.get_status())


@router.post("/stop", response_model=SimStatus)
async def stop_simulation(request: Request):
    mgr = _get_manager(request)
    await mgr.stop()
    return SimStatus(**mgr.get_status())


@router.post("/reset", response_model=SimStatus)
async def reset_simulation(request: Request):
    mgr = _get_manager(request)
    await mgr.reset()
    return SimStatus(**mgr.get_status())


@router.get("/state")
async def get_state(request: Request):
    mgr = _get_manager(request)
    snapshot = mgr.get_current_snapshot()
    if snapshot is None:
        return {"status": mgr.get_status(), "snapshot": None}
    return {"status": mgr.get_status(), "snapshot": snapshot.model_dump()}


@router.get("/checkpoints", response_model=list[CheckpointInfo])
async def list_checkpoints(request: Request):
    output_base = "/app/checkpoints"
    results: list[CheckpointInfo] = []
    if not os.path.isdir(output_base):
        return results
    for pt_file in glob.glob(os.path.join(output_base, "**", "*_best.pt"), recursive=True):
        name = os.path.basename(pt_file)
        algo = name.replace("_best.pt", "")
        size = os.path.getsize(pt_file)
        results.append(CheckpointInfo(algo=algo, path=pt_file, size_bytes=size))
    return results
