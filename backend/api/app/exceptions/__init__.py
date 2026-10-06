"""Error handling: domain exceptions and their wire representation."""

from __future__ import annotations

from .errors import (
    ERROR_CATALOG,
    AnalysisFailed,
    AppError,
    AuthenticationFailed,
    Conflict,
    NotFound,
    PermissionDenied,
    RateLimited,
    UpstreamUnavailable,
    ValidationFailed,
)
from .handlers import register_exception_handlers

__all__ = [
    "AppError",
    "ValidationFailed",
    "AuthenticationFailed",
    "PermissionDenied",
    "NotFound",
    "Conflict",
    "RateLimited",
    "UpstreamUnavailable",
    "AnalysisFailed",
    "ERROR_CATALOG",
    "register_exception_handlers",
]