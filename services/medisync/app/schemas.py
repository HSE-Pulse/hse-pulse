from __future__ import annotations

import enum
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class SimState(str, enum.Enum):
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    DONE = "done"


class AlgoName(str, enum.Enum):
    MADDPG = "maddpg"
    MAPPO = "mappo"


class PolicyMode(str, enum.Enum):
    """MARL policy selection — includes baseline (fixed staffing, zero actions)."""
    MADDPG = "maddpg"
    MAPPO = "mappo"
    BASELINE = "baseline"


# ---------------------------------------------------------------------------
# Requests
# ---------------------------------------------------------------------------

class StartRequest(BaseModel):
    data_dir: str = Field("./app/data", description="Path to MIMIC-IV JSON data directory")
    max_patients: Optional[int] = Field(None, description="Cap on patient count")
    checkpoint_dir: Optional[str] = Field(None, description="Directory containing *_best.pt files")
    algo: AlgoName = Field(AlgoName.MAPPO, description="Initial algorithm")
    deterministic: bool = Field(True, description="Deterministic action sampling")
    speed: int = Field(2, ge=1, le=6, description="Playback speed 1-6")
    episode_hours: int = Field(168, description="Episode length in hours")
    seed: int = Field(42)
    use_synthetic: bool = Field(False, description="Use synthetic data instead of MIMIC-IV")
    synthetic_patients: int = Field(1000, description="Number of synthetic patients if use_synthetic=True")


class AlgoSwitch(BaseModel):
    algo: AlgoName


class SamplingToggle(BaseModel):
    deterministic: bool


class StageSelect(BaseModel):
    stage: int = Field(..., ge=1, le=5, description="Curriculum stage 1-5")


class SpeedChange(BaseModel):
    speed: int = Field(..., ge=1, le=6)


class StaffingOverride(BaseModel):
    department: str
    doctors: Optional[int] = None
    nurses: Optional[int] = None
    hcws: Optional[int] = None
    admins: Optional[int] = None


class ParamUpdate(BaseModel):
    arrival_rate_multiplier: Optional[float] = Field(None, ge=0.1, le=3.0)
    staffing: Optional[list[StaffingOverride]] = None
    capacity: Optional[dict[str, int]] = None
    base_service_time: Optional[dict[str, float]] = None


# ---------------------------------------------------------------------------
# Snapshot models (server → client)
# ---------------------------------------------------------------------------

class DepartmentSnapshot(BaseModel):
    queue_len: int
    in_service_count: int
    staff: dict[str, int]
    service_capacity: int
    avg_wait: float
    avg_acuity: float
    reward: float
    actions: list[float]
    obs: list[float]


class TotalsSnapshot(BaseModel):
    discharged: int
    active_patients: int
    mean_wait: float
    mean_los: float
    throughput: int


class MetaSnapshot(BaseModel):
    algo: str
    deterministic: bool
    speed: int
    stage: str
    stage_index: int
    step: int
    total_steps: int
    sim_time_minutes: float
    sim_hour: float
    sim_day: float
    decision_point: bool
    state: SimState


class TickSnapshot(BaseModel):
    departments: dict[str, DepartmentSnapshot]
    totals: TotalsSnapshot
    meta: MetaSnapshot


class ParamsResponse(BaseModel):
    arrival_rate_multiplier: float
    staffing: dict[str, dict[str, int]]
    capacity: dict[str, int]
    base_service_time: dict[str, float]
    episode_hours: int
    stage: str
    stage_index: int


class DefaultsResponse(BaseModel):
    departments: list[str]
    constrained_staffing: dict[str, dict[str, int]]
    generous_staffing: dict[str, dict[str, int]]
    capacity: dict[str, int]
    base_service_time: dict[str, float]
    min_staff: dict[str, int]
    max_staff: dict[str, int]
    curriculum_stages: list[dict]
    episode_hours: int


class CheckpointInfo(BaseModel):
    algo: str
    path: str
    size_bytes: int


class SimStatus(BaseModel):
    state: SimState
    algo: str
    deterministic: bool
    speed: int
    step: int
    total_steps: int
    episode_hours: int


# ---------------------------------------------------------------------------
# DES event models
# ---------------------------------------------------------------------------

class DESEvent(BaseModel):
    """A single discrete-event extracted by diffing env state pre/post step."""
    event_type: str = Field(
        ...,
        description="One of: arrival, service_start, service_complete, transfer, discharge",
    )
    sim_time: float = Field(..., description="Simulation time in minutes")
    patient_id: int
    department: str
    details: dict = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Per-department metrics
# ---------------------------------------------------------------------------

class DepartmentMetrics(BaseModel):
    department: str
    queue_length: int
    in_service: int
    avg_wait_minutes: float
    avg_acuity: float
    staff: dict[str, int]
    service_capacity: int
    utilization: float = Field(
        ..., description="in_service / service_capacity (0-1)"
    )
    reward: float


# ---------------------------------------------------------------------------
# Full step-level metrics bundle streamed over /stream/metrics
# ---------------------------------------------------------------------------

class StepMetrics(BaseModel):
    step: int
    sim_time_minutes: float
    sim_hour: float
    sim_day: float
    decision_point: bool
    policy: str
    deterministic: bool
    total_reward: float
    departments: list[DepartmentMetrics]
    events: list[DESEvent]
    totals: TotalsSnapshot
    state: SimState


# ---------------------------------------------------------------------------
# Aggregated metrics history
# ---------------------------------------------------------------------------

class MetricsHistory(BaseModel):
    """Rolling-window smoothed series for UI charts."""
    steps: list[int]
    sim_hours: list[float]
    mean_wait: list[float]
    mean_los: list[float]
    throughput: list[int]
    total_reward: list[float]
    queue_lengths: dict[str, list[int]]
    utilizations: dict[str, list[float]]


# ---------------------------------------------------------------------------
# Consolidated request models for server.py endpoints
# ---------------------------------------------------------------------------

class ConfigUpdateRequest(BaseModel):
    """POST /config/update — runtime environment parameter changes."""
    arrival_rate_multiplier: Optional[float] = Field(None, ge=0.1, le=3.0)
    staffing: Optional[dict[str, dict[str, int]]] = Field(
        None, description="dept → {doctors, nurses, hcws, admins}"
    )
    capacity: Optional[dict[str, int]] = None
    base_service_time: Optional[dict[str, float]] = None
    stage: Optional[int] = Field(None, ge=1, le=5)
    seed: Optional[int] = None
    speed: Optional[int] = Field(None, ge=1, le=6)


class PolicySelectRequest(BaseModel):
    """POST /policy/select — switch between MARL policies or baseline."""
    policy: PolicyMode
    deterministic: bool = Field(True, description="Greedy (True) or stochastic (False)")
