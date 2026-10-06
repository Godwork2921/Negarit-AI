"""FastAPI dependencies shared by the routers.

The database session is provided as a generator dependency that always closes
and always rolls back on an unexpected error, so a failed request cannot leave
an open transaction holding locks.
"""

from __future__ import annotations

import logging
import uuid
from collections.abc import Generator
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import Settings
from app.database.session import build_engine, build_session_factory
from app.exceptions import AuthenticationFailed, UpstreamUnavailable
from app.models import User
from app.security import decode_token
from app.services import AnalysisService, AuthService

__all__ = [
    "get_settings_dep",
    "get_session",
    "get_optional_session",
    "SessionDep",
    "OptionalSessionDep",
    "get_current_user",
    "get_optional_user",
    "CurrentUser",
    "OptionalUser",
    "get_analysis_service",
    "get_auth_service",
    "bearer_scheme",
]

logger = logging.getLogger("negarit.api.deps")

# ``auto_error=False`` so an absent header yields ``None`` rather than an
# immediate 401, which is what the optional-auth flow needs.
bearer_scheme = HTTPBearer(auto_error=False)

# Built lazily and reused. Constructing a pool per request would exhaust
# PostgreSQL connections under any real load.
_ENGINE_CACHE: dict[str, object] = {}


def _get_engine(settings: Settings):
    key = settings.database_url
    if key not in _ENGINE_CACHE:
        _ENGINE_CACHE[key] = build_engine(settings)
    return _ENGINE_CACHE[key]


def get_settings_dep(request: Request) -> Settings:
    """Settings attached to the running application."""
    return request.app.state.settings


def get_session(settings: Annotated[Settings, Depends(get_settings_dep)]) -> Generator[Session, None, None]:
    """Yield a database session, required to be reachable."""
    factory = build_session_factory(_get_engine(settings))
    session = factory()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_optional_session(
    settings: Annotated[Settings, Depends(get_settings_dep)],
) -> Generator[Session | None, None, None]:
    """Yield a session, or ``None`` when the database is unreachable.

    Analysis does not need storage to produce a verdict, so it stays available
    when PostgreSQL is down. Only the endpoints that genuinely require storage
    use :func:`get_session`, which fails loudly instead.
    """
    try:
        factory = build_session_factory(_get_engine(settings))
        session = factory()
        session.connection()
    except Exception as exc:
        logger.warning("database_unavailable path=optional detail=%s", type(exc).__name__)
        yield None
        return

    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


SessionDep = Annotated[Session, Depends(get_session)]
OptionalSessionDep = Annotated["Session | None", Depends(get_optional_session)]


def get_auth_service(
    session: SessionDep,
    settings: Annotated[Settings, Depends(get_settings_dep)],
) -> AuthService:
    return AuthService(session, settings)


def get_current_user(
    session: SessionDep,
    settings: Annotated[Settings, Depends(get_settings_dep)],
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
) -> User:
    """Resolve the authenticated principal, or fail with 401."""
    if credentials is None or not credentials.credentials:
        raise AuthenticationFailed("Sign in to access this resource.")

    payload = decode_token(settings, credentials.credentials, expected_type="access")

    try:
        user_id = uuid.UUID(payload.subject)
    except ValueError as exc:
        raise AuthenticationFailed("The authentication token is not valid.") from exc

    from app.database.repositories import UserRepository

    user = UserRepository(session).get_by_id(user_id)
    if user is None or not user.is_active:
        raise AuthenticationFailed("This account is no longer available.")
    return user


def get_optional_user(
    session: OptionalSessionDep,
    settings: Annotated[Settings, Depends(get_settings_dep)],
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
) -> User | None:
    """Resolve the principal when a valid token is present.

    Analysis is available without an account on purpose: asking someone to
    sign in before submitting a suspected phishing message would push them to
    use a throwaway address and store the evidence against nothing. A valid
    token is still honoured so results are saved to their history.
    """
    if credentials is None or not credentials.credentials or session is None:
        return None

    try:
        payload = decode_token(settings, credentials.credentials, expected_type="access")
        user_id = uuid.UUID(payload.subject)
    except (AuthenticationFailed, ValueError):
        # An unusable token on an optional route is treated as anonymous rather
        # than as an error; the strict dependency above covers protected routes.
        return None

    from app.database.repositories import UserRepository

    user = UserRepository(session).get_by_id(user_id)
    return user if user is not None and user.is_active else None


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated["User | None", Depends(get_optional_user)]


def get_analysis_service(
    settings: Annotated[Settings, Depends(get_settings_dep)],
    session: OptionalSessionDep,
) -> AnalysisService:
    return AnalysisService(settings, session)