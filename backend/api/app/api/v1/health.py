"""Liveness and readiness reporting.

``/health`` is deliberately unauthenticated and dependency-tolerant: a monitor
must still be able to observe a degraded service, so each dependency is
reported individually rather than collapsing the whole response to a single
failure.
"""

from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, Request, Response, status
from pydantic import BaseModel, Field

from app.integrations import EngineUnavailable, engine_info

__all__ = ["router", "HealthResponse"]

router = APIRouter(tags=["health"])

_STARTED_AT = time.monotonic()


class HealthResponse(BaseModel):
    """Liveness plus per-dependency status."""

    status: str = Field(description="ok | degraded | error")
    version: str
    environment: str
    uptime_seconds: float
    dependencies: dict[str, Any] = Field(
        default_factory=dict,
        description="Per-dependency status. A failing dependency is listed "
        "here rather than failing the whole check.",
    )


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Liveness and dependency status",
)
async def health(request: Request, response: Response) -> HealthResponse:
    settings = request.app.state.settings
    dependencies: dict[str, Any] = {}

    # --- Detection engine ---
    try:
        info = engine_info()
        dependencies["detection_engine"] = {
            "status": "ok",
            "version": info["version"],
            "modules": info["modules"],
            "pending_modules": info["modules_pending"],
        }
    except EngineUnavailable as exc:
        # Analysis is the product. Without the engine the service is not usable,
        # so it reports error rather than quietly serving degraded results.
        dependencies["detection_engine"] = {"status": "error", "detail": str(exc)}
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    # --- Database ---
    from app.database.session import check_database

    dependencies["database"] = await check_database(settings)

    # --- Threat intelligence ---
    dependencies["threat_intelligence"] = {
        "status": "ok" if settings.threat_intel_enabled else "disabled",
        "detail": (
            "provider enabled"
            if settings.threat_intel_enabled
            else "no provider configured; reputation signals are reported as unavailable"
        ),
    }

    # --- OCR / image analysis ---
    from app.integrations.image_analysis import image_analysis_status

    dependencies["image_analysis"] = image_analysis_status()

    engine_state = dependencies["detection_engine"]["status"]
    database_state = dependencies["database"]["status"]
    if engine_state == "error" or database_state == "error":
        overall = "error"
    elif engine_state != "ok" or database_state != "ok":
        overall = "degraded"
    else:
        overall = "ok"

    return HealthResponse(
        status=overall,
        version=settings.app_version,
        environment=settings.app_env,
        uptime_seconds=round(time.monotonic() - _STARTED_AT, 2),
        dependencies=dependencies,
    )