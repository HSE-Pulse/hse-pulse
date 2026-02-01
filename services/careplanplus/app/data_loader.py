"""
Data loader for CarePlanPlus JSON data files.
Loads MongoDB extended JSON format and builds in-memory indexes.
"""

import json
import os
import logging
import math
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

DATA_DIR = os.getenv("DATA_DIR", "/app/data")

_data_store: Dict[str, List[Dict[str, Any]]] = {}
_indexes: Dict[str, Dict] = {}


def _clean_value(val: Any) -> Any:
    """Convert MongoDB extended JSON types to plain Python types."""
    if isinstance(val, dict):
        if "$oid" in val:
            return val["$oid"]
        if "$date" in val:
            return val["$date"]
        if "$numberDouble" in val:
            raw = val["$numberDouble"]
            if raw == "NaN" or raw == "Infinity" or raw == "-Infinity":
                return None
            return float(raw)
        if "$numberInt" in val:
            return int(val["$numberInt"])
        if "$numberLong" in val:
            return int(val["$numberLong"])
        return {k: _clean_value(v) for k, v in val.items()}
    if isinstance(val, list):
        return [_clean_value(item) for item in val]
    if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
        return None
    return val


def _load_json_file(filename: str) -> List[Dict[str, Any]]:
    """Load and clean a JSON data file."""
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        logger.warning(f"Data file not found: {path}")
        return []
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)
    return [_clean_value(record) for record in raw]


def load_all_data() -> None:
    """Load all JSON data files into memory and build indexes."""
    global _data_store, _indexes

    files = {
        "patients": "recommender_system.patients.json",
        "admissions": "recommender_system.admissions.json",
        "diagnoses_icd": "recommender_system.diagnoses_icd.json",
        "procedures_icd": "recommender_system.procedures_icd.json",
        "nies": "recommender_system.nies.json",
        "d_icd_diagnoses": "recommender_system.d_icd_diagnoses.json",
        "d_icd_procedures": "recommender_system.d_icd_procedures.json",
    }

    for key, filename in files.items():
        _data_store[key] = _load_json_file(filename)
        logger.info(f"Loaded {len(_data_store[key])} records from {filename}")

    # Build indexes
    _indexes["patients_by_id"] = {
        r["subject_id"]: r for r in _data_store["patients"] if "subject_id" in r
    }
    _indexes["admissions_by_subject"] = {}
    for r in _data_store["admissions"]:
        sid = r.get("subject_id")
        if sid is not None:
            _indexes["admissions_by_subject"].setdefault(sid, []).append(r)

    _indexes["admissions_by_hadm"] = {
        r["hadm_id"]: r for r in _data_store["admissions"] if "hadm_id" in r
    }

    _indexes["diagnoses_by_hadm"] = {}
    for r in _data_store["diagnoses_icd"]:
        hid = r.get("hadm_id")
        if hid is not None:
            _indexes["diagnoses_by_hadm"].setdefault(hid, []).append(r)

    _indexes["procedures_by_hadm"] = {}
    for r in _data_store["procedures_icd"]:
        hid = r.get("hadm_id")
        if hid is not None:
            _indexes["procedures_by_hadm"].setdefault(hid, []).append(r)

    _indexes["diag_icd_by_code"] = {}
    for r in _data_store["d_icd_diagnoses"]:
        code = r.get("icd_code")
        if code is not None:
            _indexes["diag_icd_by_code"][str(code)] = r

    _indexes["proc_icd_by_code"] = {}
    for r in _data_store["d_icd_procedures"]:
        code = r.get("icd_code")
        if code is not None:
            _indexes["proc_icd_by_code"][str(code)] = r

    logger.info("All data loaded and indexed successfully")


def get_stats() -> Dict[str, int]:
    """Get aggregate counts."""
    return {
        "patients": len(_data_store.get("patients", [])),
        "admissions": len(_data_store.get("admissions", [])),
        "diagnoses": len(_data_store.get("diagnoses_icd", [])),
        "procedures": len(_data_store.get("procedures_icd", [])),
        "nies_records": len(_data_store.get("nies", [])),
        "icd_diagnosis_codes": len(_data_store.get("d_icd_diagnoses", [])),
        "icd_procedure_codes": len(_data_store.get("d_icd_procedures", [])),
    }


def get_patients(page: int = 1, per_page: int = 20) -> Dict[str, Any]:
    """Get paginated patient list."""
    data = _data_store.get("patients", [])
    total = len(data)
    start = (page - 1) * per_page
    end = start + per_page
    return {
        "items": data[start:end],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": math.ceil(total / per_page) if per_page > 0 else 0,
    }


def get_patient_detail(subject_id: int) -> Optional[Dict[str, Any]]:
    """Get patient detail with admissions, diagnoses, and procedures."""
    patient = _indexes.get("patients_by_id", {}).get(subject_id)
    if patient is None:
        return None

    admissions = _indexes.get("admissions_by_subject", {}).get(subject_id, [])
    all_diagnoses = []
    all_procedures = []
    for adm in admissions:
        hadm_id = adm.get("hadm_id")
        if hadm_id:
            diags = _indexes.get("diagnoses_by_hadm", {}).get(hadm_id, [])
            procs = _indexes.get("procedures_by_hadm", {}).get(hadm_id, [])
            all_diagnoses.extend(diags)
            all_procedures.extend(procs)

    return {
        **patient,
        "admissions": admissions,
        "diagnoses": all_diagnoses,
        "procedures": all_procedures,
    }


def get_admissions(
    subject_id: Optional[int] = None, page: int = 1, per_page: int = 20
) -> Dict[str, Any]:
    """Get admissions, optionally filtered by subject_id."""
    if subject_id is not None:
        data = _indexes.get("admissions_by_subject", {}).get(subject_id, [])
    else:
        data = _data_store.get("admissions", [])
    total = len(data)
    start = (page - 1) * per_page
    end = start + per_page
    return {
        "items": data[start:end],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": math.ceil(total / per_page) if per_page > 0 else 0,
    }


def get_diagnoses(
    hadm_id: Optional[int] = None, page: int = 1, per_page: int = 50
) -> Dict[str, Any]:
    """Get diagnoses, optionally filtered by hadm_id."""
    if hadm_id is not None:
        data = _indexes.get("diagnoses_by_hadm", {}).get(hadm_id, [])
    else:
        data = _data_store.get("diagnoses_icd", [])
    total = len(data)
    start = (page - 1) * per_page
    end = start + per_page
    return {
        "items": data[start:end],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": math.ceil(total / per_page) if per_page > 0 else 0,
    }


def get_procedures(
    hadm_id: Optional[int] = None, page: int = 1, per_page: int = 50
) -> Dict[str, Any]:
    """Get procedures, optionally filtered by hadm_id."""
    if hadm_id is not None:
        data = _indexes.get("procedures_by_hadm", {}).get(hadm_id, [])
    else:
        data = _data_store.get("procedures_icd", [])
    total = len(data)
    start = (page - 1) * per_page
    end = start + per_page
    return {
        "items": data[start:end],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": math.ceil(total / per_page) if per_page > 0 else 0,
    }


def search_icd_diagnoses(query: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Search ICD diagnosis codes by long_title (case-insensitive substring)."""
    if not query or len(query) < 2:
        return []
    q = query.lower()
    results = []
    for record in _data_store.get("d_icd_diagnoses", []):
        title = record.get("long_title", "")
        code = str(record.get("icd_code", ""))
        if q in title.lower() or q in code.lower():
            results.append(record)
            if len(results) >= limit:
                break
    return results


def search_icd_procedures(query: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Search ICD procedure codes by long_title (case-insensitive substring)."""
    if not query or len(query) < 2:
        return []
    q = query.lower()
    results = []
    for record in _data_store.get("d_icd_procedures", []):
        title = record.get("long_title", "")
        code = str(record.get("icd_code", ""))
        if q in title.lower() or q in code.lower():
            results.append(record)
            if len(results) >= limit:
                break
    return results


def get_nies(
    condition_label: Optional[str] = None, page: int = 1, per_page: int = 50
) -> Dict[str, Any]:
    """Get NIES data, optionally filtered by condition_label."""
    data = _data_store.get("nies", [])
    if condition_label:
        cl = condition_label.lower()
        data = [r for r in data if cl in r.get("condition_label", "").lower()]
    total = len(data)
    start = (page - 1) * per_page
    end = start + per_page
    return {
        "items": data[start:end],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": math.ceil(total / per_page) if per_page > 0 else 0,
    }


def get_nies_summary() -> Dict[str, Any]:
    """Get aggregated NIES satisfaction scores by condition category."""
    data = _data_store.get("nies", [])
    categories: Dict[str, Dict[str, Any]] = {}

    for record in data:
        label = record.get("condition_label", "Unknown")
        score = record.get("satisfaction_score")
        if score is None:
            continue

        if label not in categories:
            categories[label] = {
                "condition_label": label,
                "count": 0,
                "total_score": 0.0,
                "min_score": score,
                "max_score": score,
                "icd10_from": record.get("icd10_from"),
                "icd10_to": record.get("icd10_to"),
            }

        cat = categories[label]
        cat["count"] += 1
        cat["total_score"] += score
        if score < cat["min_score"]:
            cat["min_score"] = score
        if score > cat["max_score"]:
            cat["max_score"] = score

    summary = []
    for cat in categories.values():
        avg = cat["total_score"] / cat["count"] if cat["count"] > 0 else 0
        summary.append({
            "condition_label": cat["condition_label"],
            "count": cat["count"],
            "avg_satisfaction": round(avg, 4),
            "min_satisfaction": round(cat["min_score"], 4),
            "max_satisfaction": round(cat["max_score"], 4),
            "icd10_from": cat["icd10_from"],
            "icd10_to": cat["icd10_to"],
        })

    summary.sort(key=lambda x: x["avg_satisfaction"], reverse=True)
    return {"categories": summary, "total_records": len(data)}
