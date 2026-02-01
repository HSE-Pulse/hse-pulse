import torch
from dataclasses import dataclass

DEPARTMENTS = ['Emergency Department', 'ED Observation', 'Medicine', 'Med/Surg',
               'Medicine/Cardiology', 'Neurology', 'ICU', 'Stepdown Unit', 'Discharge Lounge']

CAREUNIT_MAP = {
    'Emergency Department': 'Emergency Department', 'Emergency Department Observation': 'ED Observation',
    'Medicine': 'Medicine', 'Med/Surg': 'Med/Surg', 'Medicine/Cardiology': 'Medicine/Cardiology',
    'Neurology': 'Neurology', 'Discharge Lounge': 'Discharge Lounge',
    'Medical Intensive Care Unit (MICU)': 'ICU', 'Surgical Intensive Care Unit (SICU)': 'ICU',
    'Cardiac Vascular Intensive Care Unit (CVICU)': 'ICU', 'Coronary Care Unit (CCU)': 'ICU',
    'Medical/Surgical Intensive Care Unit (MICU/SICU)': 'ICU', 'Neuro Surgical Intensive Care Unit (Neuro SICU)': 'ICU',
    'Trauma SICU (TSICU)': 'ICU', 'Neuro Intermediate': 'Stepdown Unit', 'Neuro Stepdown': 'Stepdown Unit',
    'Hematology/Oncology Intermediate': 'Stepdown Unit', 'Medicine/Cardiology Intermediate': 'Stepdown Unit',
    'Cardiology Surgery Intermediate': 'Stepdown Unit', 'PACU': 'Stepdown Unit', 'Observation': 'ED Observation',
    'Hematology/Oncology': 'Medicine', 'Transplant': 'Medicine', 'Psychiatry': 'Medicine',
    'Cardiology': 'Medicine/Cardiology', 'Vascular': 'Med/Surg', 'Med/Surg/Trauma': 'Med/Surg',
    'Cardiac Surgery': 'Med/Surg', 'Med/Surg/GYN': 'Med/Surg', 'Labor & Delivery': 'Med/Surg',
    'Surgery/Trauma': 'Med/Surg', 'Surgery': 'Med/Surg', 'Thoracic Surgery': 'Med/Surg',
}

ADMISSION_ACUITY = {
    'DIRECT EMER.': 0.85, 'EW EMER.': 0.9, 'URGENT': 0.75, 'EMERGENCY': 0.85,
    'OBSERVATION ADMIT': 0.6, 'SURGICAL SAME DAY ADMISSION': 0.5, 'ELECTIVE': 0.4, 'EU OBSERVATION': 0.5,
}

CONSTRAINED_STAFFING = {
    'Emergency Department': {'doctors': 2, 'nurses': 4, 'hcws': 1, 'admins': 1},
    'ED Observation': {'doctors': 1, 'nurses': 3, 'hcws': 1, 'admins': 1},
    'Medicine': {'doctors': 2, 'nurses': 4, 'hcws': 1, 'admins': 1},
    'Med/Surg': {'doctors': 2, 'nurses': 4, 'hcws': 1, 'admins': 1},
    'Medicine/Cardiology': {'doctors': 2, 'nurses': 4, 'hcws': 1, 'admins': 1},
    'Neurology': {'doctors': 2, 'nurses': 4, 'hcws': 1, 'admins': 1},
    'ICU': {'doctors': 3, 'nurses': 8, 'hcws': 1, 'admins': 1},
    'Stepdown Unit': {'doctors': 2, 'nurses': 5, 'hcws': 1, 'admins': 1},
    'Discharge Lounge': {'doctors': 1, 'nurses': 2, 'hcws': 1, 'admins': 1},
}

GENEROUS_STAFFING = {
    'Emergency Department': {'doctors': 5, 'nurses': 10, 'hcws': 3, 'admins': 2},
    'ED Observation': {'doctors': 3, 'nurses': 6, 'hcws': 2, 'admins': 1},
    'Medicine': {'doctors': 4, 'nurses': 8, 'hcws': 2, 'admins': 1},
    'Med/Surg': {'doctors': 4, 'nurses': 8, 'hcws': 2, 'admins': 1},
    'Medicine/Cardiology': {'doctors': 4, 'nurses': 8, 'hcws': 2, 'admins': 1},
    'Neurology': {'doctors': 3, 'nurses': 6, 'hcws': 2, 'admins': 1},
    'ICU': {'doctors': 5, 'nurses': 12, 'hcws': 2, 'admins': 1},
    'Stepdown Unit': {'doctors': 3, 'nurses': 8, 'hcws': 2, 'admins': 1},
    'Discharge Lounge': {'doctors': 2, 'nurses': 4, 'hcws': 2, 'admins': 1},
}

BASE_SERVICE_TIME = {
    'Emergency Department': 180, 'ED Observation': 180, 'Medicine': 1440,
    'Med/Surg': 300, 'Medicine/Cardiology': 240, 'Neurology': 240,
    'ICU': 4320, 'Stepdown Unit': 240, 'Discharge Lounge': 30,
}

STAFF_COST = {'doctors': 5.0, 'nurses': 2.0, 'hcws': 1.0, 'admins': 1.5}

CAPACITY = {'Emergency Department': 50, 'ED Observation': 50, 'Medicine': 50, 'Med/Surg': 50,
            'Medicine/Cardiology': 50, 'Neurology': 50, 'ICU': 20, 'Stepdown Unit': 30, 'Discharge Lounge': 50}

MIN_STAFF = {'doctors': 1, 'nurses': 2, 'hcws': 0, 'admins': 0}
MAX_STAFF = {'doctors': 10, 'nurses': 20, 'hcws': 10, 'admins': 5}

@dataclass
class CurriculumStage:
    name: str
    acuity_range: tuple
    max_pathway_length: int
    patient_fraction: float
    staffing_multiplier: float
    arrival_rate_multiplier: float
    episodes: int

CURRICULUM_STAGES = [
    CurriculumStage("Stage 1: Easy", (0.0, 0.60), 4, 0.35, 1.5, 0.5, 10),
    CurriculumStage("Stage 2: Medium-Easy", (0.0, 0.70), 5, 0.50, 1.3, 0.7, 15),
    CurriculumStage("Stage 3: Medium", (0.0, 0.85), 6, 0.65, 1.1, 0.85, 20),
    CurriculumStage("Stage 4: Medium-Hard", (0.0, 0.95), 8, 0.80, 1.0, 0.95, 25),
    CurriculumStage("Stage 5: Full Difficulty", (0.0, 1.0), 10, 1.0, 1.0, 1.0, 30),
]

HYPERPARAMS = {
    'batch_size': 256,
    'buffer_size': 500000,
    'lr': 0.0001,
    'gamma': 0.98,
    'tau': 0.01,
    'hidden_dims': [256, 256],
    'time_step': 5,
    'episode_hours': 168,
}

def get_device():
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")

def interpolate_staffing(multiplier):
    result = {}
    for d in DEPARTMENTS:
        result[d] = {}
        for s in ['doctors', 'nurses', 'hcws', 'admins']:
            lo, hi = CONSTRAINED_STAFFING[d][s], GENEROUS_STAFFING[d][s]
            t = max(0, min(1, (multiplier - 1.0) / 0.5))
            result[d][s] = int(lo + t * (hi - lo))
    return result
