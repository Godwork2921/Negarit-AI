"""Account creation and session management."""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status

from app.api.deps import CurrentUser, get_auth_service
from app.config import Settings
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
    UserResponse,
)
from app.schemas.common import MessageResponse
from app.services import AuthService

__all__ = ["router"]

logger = logging.getLogger("negarit.api.v1.auth")

router = APIRouter(prefix="/auth", tags=["auth"])

AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def _user_agent(request: Request) -> str | None:
    return request.headers.get("user-agent")


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an account",
    responses={
        409: {"description": "An account with this email already exists."},
        422: {"description": "The submitted details are invalid."},
    },
)
async def register(
    payload: RegisterRequest,
    service: AuthServiceDep,
) -> AuthResponse:
    """Create an account and sign the new user in."""
    user, tokens = service.register(
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
    )
    return AuthResponse(user=UserResponse.model_validate(user), tokens=tokens)


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Exchange credentials for tokens",
    responses={
        401: {"description": "Email or password is incorrect."},
        403: {"description": "The account is deactivated."},
    },
)
async def login(
    payload: LoginRequest,
    request: Request,
    service: AuthServiceDep,
) -> AuthResponse:
    """Sign in with an email and password.

    An unknown address and a wrong password produce the same error, so this
    endpoint cannot be used to discover which addresses have accounts.
    """
    user, tokens = service.login(
        email=payload.email,
        password=payload.password,
        user_agent=_user_agent(request),
        client_ip=_client_ip(request),
    )
    return AuthResponse(user=UserResponse.model_validate(user), tokens=tokens)


@router.post(
    "/refresh",
    response_model=TokenPair,
    summary="Rotate a refresh token",
    responses={401: {"description": "The refresh token is not valid."}},
)
async def refresh(
    payload: RefreshRequest,
    request: Request,
    service: AuthServiceDep,
) -> TokenPair:
    """Exchange a refresh token for a new pair, revoking the presented one."""
    return service.refresh(
        refresh_token=payload.refresh_token,
        user_agent=_user_agent(request),
        client_ip=_client_ip(request),
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Revoke a refresh session",
)
async def logout(
    payload: RefreshRequest,
    service: AuthServiceDep,
) -> MessageResponse:
    """Revoke the supplied refresh token.

    Returns success even for an unrecognised token, so this cannot be used to
    probe which sessions exist.
    """
    service.logout(refresh_token=payload.refresh_token)
    return MessageResponse(message="Signed out.")


@router.post(
    "/logout-all",
    response_model=MessageResponse,
    summary="Revoke every session for the current user",
)
async def logout_all(
    user: CurrentUser,
    service: AuthServiceDep,
) -> MessageResponse:
    count = service.logout_everywhere(user.id)
    return MessageResponse(
        message="Signed out everywhere.",
        detail=f"{count} session(s) revoked.",
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Current account",
    responses={401: {"description": "Authentication is required."}},
)
async def me(user: CurrentUser) -> UserResponse:
    """Return the authenticated account."""
    return UserResponse.model_validate(user)