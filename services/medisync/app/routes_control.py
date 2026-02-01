from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from app.schemas import (
    AlgoSwitch,
    SamplingToggle,
    StageSelect,
    SpeedChange,
    ParamUpdate,
    ParamsResponse,
    DefaultsResponse,
    SimState,
)

router = APIRouter(prefix="/control", tags=["control"])


def _get_manager(request: Request):
    return request.app.state.sim_manager


@router.post("/algo")
async def switch_algorithm(body: AlgoSwitch, request: Request):
    mgr = _get_manager(request)
    try:
        await mgr.switch_algo(body.algo)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    return {"algo": mgr.active_algo.value}


@router.post("/sampling")
async def toggle_sampling(body: SamplingToggle, request: Request):
    mgr = _get_manager(request)
    mgr.toggle_sampling(body.deterministic)
    return {"deterministic": mgr.deterministic}


@router.post("/stage")
async def set_stage(body: StageSelect, request: Request):
    mgr = _get_manager(request)
    await mgr.set_stage(body.stage)
    return {"stage_index": mgr._stage_index, "stage_name": mgr._stage_name}


@router.post("/speed")
async def set_speed(body: SpeedChange, request: Request):
    mgr = _get_manager(request)
    mgr.set_speed(body.speed)
    return {"speed": mgr.speed}


@router.post("/pause")
async def pause_simulation(request: Request):
    mgr = _get_manager(request)
    if mgr.state != SimState.RUNNING:
        raise HTTPException(400, "Simulation is not running.")
    mgr.pause()
    return {"state": mgr.state.value}


@router.post("/resume")
async def resume_simulation(request: Request):
    mgr = _get_manager(request)
    if mgr.state != SimState.PAUSED:
        raise HTTPException(400, "Simulation is not paused.")
    mgr.resume()
    return {"state": mgr.state.value}


@router.post("/step")
async def step_forward(request: Request):
    mgr = _get_manager(request)
    if mgr.state not in (SimState.PAUSED, SimState.IDLE):
        raise HTTPException(400, "Can only step when paused or idle.")
    snapshot = await mgr.step_forward()
    if snapshot is None:
        raise HTTPException(400, "Environment not initialised.")
    return snapshot.model_dump()


@router.post("/params")
async def update_params(body: ParamUpdate, request: Request):
    mgr = _get_manager(request)
    if mgr.env is None:
        raise HTTPException(400, "Environment not initialised. Start a simulation first.")
    await mgr.update_params(body)
    return mgr.get_current_params()


@router.get("/params", response_model=ParamsResponse)
async def get_params(request: Request):
    mgr = _get_manager(request)
    if mgr.env is None:
        raise HTTPException(400, "Environment not initialised.")
    return ParamsResponse(**mgr.get_current_params())


@router.get("/defaults", response_model=DefaultsResponse)
async def get_defaults(request: Request):
    return DefaultsResponse(**mgr_defaults())


def mgr_defaults():
    from app.simulation import SimulationManager
    return SimulationManager.get_defaults()
