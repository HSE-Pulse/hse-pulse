"""
MediSync API — thin entry-point wrapper.

    uvicorn app.main:app --host 0.0.0.0 --port 8000
"""

from app.server import app  # noqa: F401
