"""Business rules for authentication.

Two behaviours here are deliberate and worth calling out:

- **Registration and login return the same generic error for an unknown
  account and a wrong password.** Differentiating them turns the login form
  into an account-enumeration oracle.
- **Login always performs the hash verification**, using a throwaway hash when
  no user matched. Skipping the work would make "no such email" measurably
  faster than "wrong password", which is the same leak with extra steps.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.config import Settings
from app.database.repositories import RefreshTokenRepository, UserRepository
from app.exceptions import AuthenticationFailed, Conflict
from app.models import User
from app.security import (
    DUMMY_HASH,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    needs_rehash,
    verify_password,
)
from app.schemas.auth import TokenPair

__all__ = ["AuthService"]

logger = logging.getLogger("negarit.api.services.auth")

_GENERIC_LOGIN_FAILURE = "Email or password is incorrect."


class AuthService:
    """Account creation and session management."""

    def __init__(self, session: Session, settings: Settings) -> None:
        self._session = session
        self._settings = settings
        self._users = UserRepository(session)
        self._tokens = RefreshTokenRepository(session)

    # ── Helpers ─────────────────────────────────────────────────────

    def _hash_params(self) -> dict[str, int]:
        return {
            "iterations": self._settings.password_hash_iterations,
            "memory_kib": self._settings.password_hash_memory_kib,
            "parallelism": self._settings.password_hash_parallelism,
        }

    def _issue_pair(
        self,
        user: User,
        *,
        user_agent: str | None = None,
        client_ip: str | None = None,
    ) -> TokenPair:
        settings = self._settings
        subject = str(user.id)

        access_token, _ = create_access_token(
            settings, subject=subject, extra_claims={"email": user.email}
        )
        refresh_token, refresh_expires = create_refresh_token(settings, subject=subject)

        self._tokens.create(
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            expires_at=refresh_expires,
            user_agent=user_agent,
            client_ip=client_ip,
        )

        return TokenPair(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.access_token_expire_minutes * 60,
        )

    # ── Operations ──────────────────────────────────────────────────

    def register(
        self,
        *,
        email: str,
        password: str,
        full_name: str | None = None,
    ) -> tuple[User, TokenPair]:
        normalised = email.strip().lower()

        if self._users.exists(normalised):
            # Registration necessarily reveals that an address is taken; the
            # message points to signing in rather than confirming the account
            # exists to an anonymous caller who guesses addresses.
            raise Conflict(
                "An account with this email already exists. Try signing in instead.",
                code="email_taken",
            )

        user = self._users.create(
            email=normalised,
            password_hash=hash_password(password, **self._hash_params()),
            full_name=full_name,
        )
        # The session row and the refresh token must land in the same commit.
        # Committing the user first and issuing the pair afterwards would hand
        # back a refresh token that was never persisted, so the very first
        # session would silently expire and only fail on the next refresh.
        pair = self._issue_pair(user)
        self._session.commit()

        logger.info(
            "user_registered",
            extra={"context": {"user_id": str(user.id), "path": "register"}},
        )
        return user, pair

    def login(
        self,
        *,
        email: str,
        password: str,
        user_agent: str | None = None,
        client_ip: str | None = None,
    ) -> tuple[User, TokenPair]:
        user = self._users.get_by_email(email.strip().lower())

        if user is None:
            # Spend the same effort as a real verification, then fail with the
            # same message, so response time does not disclose account existence.
            verify_password(DUMMY_HASH, password, **self._hash_params())
            logger.info("login_failed reason=unknown_account")
            raise AuthenticationFailed(_GENERIC_LOGIN_FAILURE)

        if not verify_password(user.password_hash, password, **self._hash_params()):
            logger.info("login_failed reason=bad_password user_id=%s", user.id)
            raise AuthenticationFailed(_GENERIC_LOGIN_FAILURE)

        if not user.is_active:
            logger.info("login_failed reason=inactive user_id=%s", user.id)
            raise AuthenticationFailed(
                "This account has been deactivated.",
                code="account_disabled",
                status_code=403,
            )

        # Migrate the stored hash onto the current cost parameters while the
        # plaintext is momentarily available.
        if needs_rehash(user.password_hash, **self._hash_params()):
            user.password_hash = hash_password(password, **self._hash_params())
            logger.info("password_rehashed user_id=%s", user.id)

        self._users.touch_login(user)
        pair = self._issue_pair(
            user, user_agent=user_agent, client_ip=client_ip
        )
        self._session.commit()
        return user, pair

    def refresh(
        self,
        *,
        refresh_token: str,
        user_agent: str | None = None,
        client_ip: str | None = None,
    ) -> TokenPair:
        """Rotate a refresh token.

        The presented token is revoked and a new one issued, so a refresh token
        that is stolen and later used by the attacker invalidates the legitimate
        user's session rather than coexisting with it.
        """
        payload = decode_token(
            self._settings, refresh_token, expected_type="refresh"
        )
        row = self._tokens.get_by_hash(hash_token(refresh_token))

        if row is None or not row.is_active:
            logger.info("refresh_rejected reason=unknown_or_revoked")
            raise AuthenticationFailed("This session is no longer valid. Please sign in again.")

        user = self._users.get_by_id(uuid.UUID(payload.subject))
        if user is None or not user.is_active:
            logger.info("refresh_rejected reason=user_gone")
            raise AuthenticationFailed("This session is no longer valid. Please sign in again.")

        self._tokens.revoke(row)
        pair = self._issue_pair(user, user_agent=user_agent, client_ip=client_ip)
        self._session.commit()
        logger.info("token_refreshed user_id=%s", user.id)
        return pair

    def logout(self, *, refresh_token: str) -> None:
        """Revoke a refresh session. Safe to call with an already-invalid token."""
        try:
            row = self._tokens.get_by_hash(hash_token(refresh_token))
        except Exception:  # pragma: no cover - defensive
            row = None
        if row is not None:
            self._tokens.revoke(row)
            self._session.commit()
            logger.info("logout user_id=%s", row.user_id)

    def logout_everywhere(self, user_id: uuid.UUID) -> int:
        count = self._tokens.revoke_all_for_user(user_id)
        self._session.commit()
        logger.info("logout_all_sessions user_id=%s revoked=%d", user_id, count)
        return count

    def get_user(self, user_id: uuid.UUID) -> User:
        user = self._users.get_by_id(user_id)
        if user is None or not user.is_active:
            raise AuthenticationFailed("This account is no longer available.")
        return user