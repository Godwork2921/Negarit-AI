"""JWT issuing and verification.

Design decisions worth stating:

- **The token type is part of the payload.** An access token cannot be used as a
  refresh token, so a stolen access token cannot be traded for a long-lived
  session.
- **Expiry is verified against UTC.** A naive datetime comparison is a common
  way to end up with tokens that never actually expire.
- **The algorithm is fixed by configuration, not taken from the token.** Letting
  the token choose its own algorithm is how ``alg: none`` and RS256-to-HS256
  confusion attacks succeed.
- **Failures raise one typed error.** The caller returns a generic message and
  never reveals whether the signature, the audience or the expiry was wrong.
"""

from __future__ import annotations

import hashlib
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import jwt

from app.config import Settings
from app.exceptions import AuthenticationFailed

__all__ = [
    "TokenPayload",
    "create_access_token",
    "create_refresh_token",
    "decode_token",
    "hash_token",
    "TokenType",
]

logger = logging.getLogger("negarit.api.security.tokens")

TokenType = Literal["access", "refresh"]


@dataclass(frozen=True, slots=True)
class TokenPayload:
    """The verified contents of a token."""

    subject: str
    token_type: TokenType
    expires_at: datetime
    issued_at: datetime
    jti: str
    claims: dict[str, Any]


def _create_token(
    settings: Settings,
    *,
    subject: str,
    token_type: TokenType,
    expires_delta: timedelta,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    secret = settings.effective_jwt_secret
    if not secret:
        # Unreachable: Settings refuses to start in production without one and
        # generates an ephemeral key elsewhere. Guarded anyway, because signing
        # with an empty key must never be possible.
        raise AuthenticationFailed(
            "The server is misconfigured and cannot issue tokens.",
            code="server_misconfigured",
            status_code=500,
        )

    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
        "jti": uuid.uuid4().hex,
        "iss": settings.app_name,
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(
        payload,
        secret,
        algorithm=settings.jwt_algorithm,
    )


def create_access_token(
    settings: Settings,
    *,
    subject: str,
    extra_claims: dict[str, Any] | None = None,
) -> tuple[str, datetime]:
    """Issue an access token. Returns the token and its expiry."""
    delta = timedelta(minutes=settings.access_token_expire_minutes)
    token = _create_token(
        settings,
        subject=subject,
        token_type="access",
        expires_delta=delta,
        extra_claims=extra_claims,
    )
    return token, datetime.now(timezone.utc) + delta


def create_refresh_token(
    settings: Settings,
    *,
    subject: str,
) -> tuple[str, datetime]:
    """Issue a refresh token. Returns the token and its expiry."""
    delta = timedelta(days=settings.refresh_token_expire_days)
    token = _create_token(
        settings,
        subject=subject,
        token_type="refresh",
        expires_delta=delta,
    )
    return token, datetime.now(timezone.utc) + delta


def decode_token(
    settings: Settings,
    token: str,
    *,
    expected_type: TokenType | None = None,
) -> TokenPayload:
    """Verify a token and return its payload.

    Raises:
        AuthenticationFailed: The token is missing, malformed, expired, signed
            with the wrong key, or of the wrong type.
    """
    if not token:
        raise AuthenticationFailed("No token was provided.")

    try:
        claims = jwt.decode(
            token,
            settings.effective_jwt_secret,
            # The expected algorithm is pinned here, never read from the token.
            # Relying on the token's own header is how ``alg=none`` bypasses
            # signature verification.
            algorithms=[settings.jwt_algorithm],
            issuer=settings.app_name,
            options={"require": ["exp", "iat", "sub", "type", "jti"]},
        )
    except jwt.ExpiredSignatureError as exc:
        logger.info("token_expired")
        raise AuthenticationFailed("Your session has expired. Please sign in again.") from exc
    except jwt.InvalidTokenError as exc:
        # Covers bad signature, wrong issuer, malformed claims and wrong type.
        logger.info("token_invalid reason=%s", type(exc).__name__)
        raise AuthenticationFailed("The authentication token is not valid.") from exc

    token_type = claims.get("type")
    if expected_type is not None and token_type != expected_type:
        logger.info("token_type_mismatch got=%s want=%s", token_type, expected_type)
        raise AuthenticationFailed(
            "The authentication token is not valid for this request."
        )

    return TokenPayload(
        subject=str(claims["sub"]),
        token_type=token_type,  # type: ignore[arg-type]
        expires_at=datetime.fromtimestamp(claims["exp"], tz=timezone.utc),
        issued_at=datetime.fromtimestamp(claims["iat"], tz=timezone.utc),
        jti=str(claims["jti"]),
        claims=claims,
    )


def hash_token(token: str) -> str:
    """Hash a refresh token for storage.

    SHA-256 is the right choice here rather than a password hash: the input has
    256 bits of entropy from a CSPRNG, so there is nothing to brute force, and
    lookups must stay fast. Storing the hash means a database dump yields no
    usable sessions.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()