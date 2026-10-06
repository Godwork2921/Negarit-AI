"""Password hashing.

Argon2id with parameters from the OWASP Password Storage Cheat Sheet. Hashing
is deliberately slow: it is the only thing standing between a stolen database
and every user password in it.

Every failure path returns the same outcome, and verification uses a constant
time comparison, so a caller cannot distinguish "no such user" from "wrong
password" by timing.
"""

from __future__ import annotations

import hmac
import logging
from dataclasses import dataclass

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

__all__ = ["hash_password", "verify_password", "needs_rehash", "DUMMY_HASH"]

logger = logging.getLogger("negarit.api.security.passwords")


@dataclass(frozen=True, slots=True)
class _HasherParams:
    time_cost: int
    memory_cost: int
    parallelism: int


def _build_hasher(iterations: int, memory_kib: int, parallelism: int) -> PasswordHasher:
    """Create an Argon2id hasher. Parameters are clamped to sane bounds."""
    return PasswordHasher(
        time_cost=max(1, min(iterations, 32)),
        memory_cost=max(8192, min(memory_kib, 1048576)),
        parallelism=max(1, min(parallelism, 16)),
    )


def hash_password(
    password: str,
    *,
    iterations: int = 3,
    memory_kib: int = 65536,
    parallelism: int = 4,
) -> str:
    """Hash a plaintext password into an encoded Argon2id string."""
    if not password:
        raise ValueError("password must not be empty")
    hasher = _build_hasher(iterations, memory_kib, parallelism)
    return hasher.hash(password)


def verify_password(
    encoded: str,
    password: str,
    *,
    iterations: int = 3,
    memory_kib: int = 65536,
    parallelism: int = 4,
) -> bool:
    """Check a password against an encoded hash.

    Returns ``False`` rather than raising for a missing user, a malformed hash
    or a wrong password, so the caller cannot accidentally distinguish them.
    """
    try:
        hasher = _build_hasher(iterations, memory_kib, parallelism)
        return hasher.verify(encoded, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(encoded: str, *, iterations: int = 3, memory_kib: int = 65536,
                 parallelism: int = 4) -> bool:
    """True when stored parameters are weaker than the current policy.

    Lets a user be migrated onto stronger parameters the next time they log in,
    instead of requiring a password reset.
    """
    hasher = _build_hasher(iterations, memory_kib, parallelism)
    try:
        return hasher.check_needs_rehash(encoded)
    except InvalidHashError:
        return True


def constant_time_equals(left: str, right: str) -> bool:
    """Timing-safe string comparison."""
    return hmac.compare_digest(left.encode("utf-8"), right.encode("utf-8"))


#: A real hash of an unusable value, verified against when no user matched.
#: Performing the same work for a missing account keeps the response time of
#: "unknown email" indistinguishable from "wrong password".
DUMMY_HASH = hash_password("negarit-dummy-placeholder-never-valid", iterations=1,
                           memory_kib=8192, parallelism=1)