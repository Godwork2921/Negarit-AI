"""API surface, versioned under the configured prefix."""

from __future__ import annotations

from fastapi import APIRouter

from . import analysis, auth, health

__all__ = ["api_router"]

api_router = APIRouter()

# Health first: it is what an operator reaches for when the service misbehaves,
# and it must not depend on authentication or the database being available.
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(analysis.router)