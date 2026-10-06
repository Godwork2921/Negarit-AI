"""Authentication request and response models.

Password rules are expressed as Pydantic constraints so the rules and the
messages that enforce them cannot drift apart.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.common import ApiModel

__all__ = [
    "PasswordPolicy",
    "RegisterRequest",
    "LoginRequest",
    "RefreshRequest",
    "TokenPair",
    "UserResponse",
    "UserSummary",
]


class PasswordPolicy:
    """Minimum acceptable password properties.

    Length is the dominant factor in resistance to offline cracking, so the
    floor is deliberately modest in composition rules and generous in length.
    Requiring a symbol and a digit pushes people towards ``Password1!``, which
    is weaker than a long passphrase.
    """

    MIN_LENGTH = 12
    MAX_LENGTH = 256

    COMMON = frozenset(
        {
            "password", "12345678", "qwertyui", "letmein1", "welcome1",
            "iloveyou", "admin123", "passw0rd", "monkey12", "football1",
            "negarit", "changeme", "trustno1",
        }
    )


def _validate_password_strength(value: str) -> str:
    stripped = value.strip()
    if len(stripped) < PasswordPolicy.MIN_LENGTH:
        raise ValueError(
            f"Password must be at least {PasswordPolicy.MIN_LENGTH} characters long."
        )
    if len(value) > PasswordPolicy.MAX_LENGTH:
        # Bounded so an enormous input cannot be used to burn hashing time.
        raise ValueError(
            f"Password must be at most {PasswordPolicy.MAX_LENGTH} characters long."
        )
    if stripped.lower() in PasswordPolicy.COMMON:
        raise ValueError("This password is too common. Choose something less predictable.")
    if stripped.isdigit() or stripped.isalpha():
        raise ValueError(
            "Password must mix letters with other characters, or be a long passphrase."
        )
    return value


class RegisterRequest(BaseModel):
    """New account details."""

    email: EmailStr = Field(description="Unique login address.")
    password: str = Field(description="Plaintext password; never logged.")
    full_name: str | None = Field(default=None, max_length=200)

    _check_password = field_validator("password")(_validate_password_strength)

    @field_validator("email")
    @classmethod
    def _normalise_email(cls, value: str) -> str:
        # Addresses are case-insensitive in practice; normalising prevents
        # "A@x.com" and "a@x.com" becoming two accounts.
        return value.strip().lower()

    @field_validator("full_name")
    @classmethod
    def _clean_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=PasswordPolicy.MAX_LENGTH)

    _normalise_email = field_validator("email")(
        lambda cls, v: v.strip().lower()  # noqa: E731
    )


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class TokenPair(ApiModel):
    """Issued credentials.

    ``expires_in`` is given in seconds so the client does not have to parse the
    JWT to know when to refresh.
    """

    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int = Field(description="Access token lifetime in seconds.")


class UserSummary(ApiModel):
    """The authenticated principal.

    ``is_active`` is included so a client can explain *why* a session stopped
    working, instead of showing a generic error the user cannot act on.
    """

    id: uuid.UUID
    email: EmailStr
    full_name: str | None = None
    is_active: bool = True
    is_admin: bool = False
    created_at: datetime | None = None


#: ``/auth/me`` returns the same shape as the embedded principal.
UserResponse = UserSummary


class AuthResponse(ApiModel):
    """Register and login responses."""

    user: UserResponse
    tokens: TokenPair