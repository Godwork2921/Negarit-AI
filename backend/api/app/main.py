"""Application factory and ASGI entrypoint.

The factory pattern keeps side effects out of module import time, so tests can
build an isolated application with its own settings instead of inheriting
whatever the ambient environment happens to contain.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.config import Settings, get_settings
from app.exceptions import register_exception_handlers
from app.utils.logging import configure_logging
from app.utils.middleware import InMemoryRateLimiter, RequestContextMiddleware

__all__ = ["create_app", "app"]

logger = logging.getLogger("negarit.api")


@asynccontextmanager
async def _lifespan(application: FastAPI) -> AsyncIterator[None]:
    settings: Settings = application.state.settings
    logger.info(
        "startup",
        extra={
            "context": {
                "app_env": settings.app_env,
                "offline_mode": settings.ai_offline_mode,
                "threat_intel": settings.threat_intel_enabled,
            }
        },
    )
    if settings.is_production_like and settings.ai_offline_mode:
        logger.info(
            "offline_engine_active threat_intel_enabled=%s", settings.threat_intel_enabled
        )
    yield
    logger.info("shutdown")


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build and configure a :class:`FastAPI` application."""
    resolved = settings or get_settings()

    formatter = configure_logging(
        level=resolved.log_level,
        json_format=resolved.log_json_format,
        allowlist=resolved.log_allowlist,
    )

    application = FastAPI(
        title=resolved.app_name,
        version=resolved.app_version,
        description=(
            "Threat analysis API. Verdicts come from a deterministic offline "
            "engine; every response reports which signals were used and which "
            "checks could not run."
        ),
        docs_url="/docs" if not resolved.is_production_like else None,
        redoc_url="/redoc" if not resolved.is_production_like else None,
        openapi_url="/openapi.json" if not resolved.is_production_like else None,
        lifespan=_lifespan,
    )

    application.state.settings = resolved
    application.state.log_formatter = formatter
    # Set by the deployment when the service sits behind a proxy it controls.
    application.state.trust_forwarded_for = False

    # Middleware runs in reverse registration order: the outermost is added last.
    application.add_middleware(
        InMemoryRateLimiter,
        enabled=resolved.rate_limit_enabled,
        general_limit=resolved.rate_limit_requests,
        general_window=resolved.rate_limit_window_seconds,
        analysis_limit=resolved.analysis_rate_limit_requests,
        analysis_window=resolved.analysis_rate_limit_window_seconds,
    )
    application.add_middleware(RequestContextMiddleware)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=resolved.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
        max_age=600,
    )

    register_exception_handlers(application)
    application.include_router(api_router, prefix=resolved.api_prefix)

    @application.get("/", include_in_schema=False)
    async def root() -> dict[str, str]:
        return {
            "service": resolved.app_name,
            "version": resolved.app_version,
            "docs": "/docs",
            "api": resolved.api_prefix,
        }

    return application


#: Module-level ASGI application for `uvicorn app.main:app`.
app = create_app()