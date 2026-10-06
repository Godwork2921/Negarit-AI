"""ORM models.

Storage notes that matter for a security product:

- ``password_hash`` holds an Argon2id encoded hash. The plaintext is never
  stored, logged or returned.
- Refresh tokens are persisted as SHA-256 hashes, not as tokens. A stolen
  database therefore does not hand an attacker usable sessions.
- Analysis rows store the submitted content, because the user needs to revisit
  their own history, and ``is_sample`` marks anything seeded for demonstration
  so demo data is never confused with a real finding.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    TypeDecorator,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base

__all__ = [
    "User",
    "RefreshToken",
    "Analysis",
    "AnalysisKind",
    "AnalysisStatus",
    "RiskLevel",
    "UtcDateTime",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UtcDateTime(TypeDecorator):
    """A timestamp that is always timezone-aware UTC in Python.

    PostgreSQL honours ``timezone=True`` and hands back aware
    datetimes, but SQLite has no timezone type at all and returns naive ones.
    Comparing a value read from SQLite against ``datetime.now(timezone.utc)``
    therefore raises ``TypeError: can't compare offset-naive and offset-aware
    datetimes`` — which is how token expiry silently fails to evaluate.

    Normalising on both the way in and the way out makes every comparison in the
    service safe on any supported backend, and keeps the stored values
    unambiguous.
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            # A naive timestamp is assumed to already be UTC, which is the only
            # timezone this service writes.
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def process_result_value(self, value: datetime | None, dialect) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


class AnalysisKind(str, enum.Enum):
    MESSAGE = "message"
    URL = "url"
    IMAGE = "image"


class AnalysisStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class RiskLevel(str, enum.Enum):
    SAFE = "SAFE"
    SUSPICIOUS = "SUSPICIOUS"
    DANGEROUS = "DANGEROUS"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(200))
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        UtcDateTime(), default=_utcnow, nullable=False
    )
    last_login_at: Mapped[datetime | None] = mapped_column(UtcDateTime())

    analyses: Mapped[list["Analysis"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<User id={self.id} email={self.email!r}>"


class RefreshToken(Base):
    """A persisted refresh session.

    Only the hash of the token is stored, so the table cannot be used to mint
    sessions if it is ever exposed.
    """

    __tablename__ = "refresh_tokens"
    __table_args__ = (Index("ix_refresh_tokens_user_revoked", "user_id", "revoked_at"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(UtcDateTime(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        UtcDateTime(), default=_utcnow, nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(UtcDateTime())
    user_agent: Mapped[str | None] = mapped_column(String(400))
    client_ip: Mapped[str | None] = mapped_column(String(64))

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")

    @property
    def is_active(self) -> bool:
        return self.revoked_at is None and self.expires_at > _utcnow()


class Analysis(Base):
    """One stored analysis and its verdict."""

    __tablename__ = "analyses"
    __table_args__ = (
        Index("ix_analyses_user_created", "user_id", "created_at"),
        Index("ix_analyses_user_level", "user_id", "risk_level"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    kind: Mapped[AnalysisKind] = mapped_column(
        Enum(AnalysisKind, native_enum=False, length=20), nullable=False
    )
    status: Mapped[AnalysisStatus] = mapped_column(
        Enum(AnalysisStatus, native_enum=False, length=20),
        default=AnalysisStatus.COMPLETED,
        nullable=False,
    )

    # The submitted content, as given. Kept so the user can revisit history.
    input_text: Mapped[str] = mapped_column(Text, nullable=False)
    sender_email: Mapped[str | None] = mapped_column(String(320))

    risk_score: Mapped[int] = mapped_column(Integer, nullable=False)
    risk_level: Mapped[RiskLevel] = mapped_column(
        Enum(RiskLevel, native_enum=False, length=20), nullable=False
    )
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    has_critical_indicator: Mapped[bool] = mapped_column(Boolean, default=False)
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=True)

    # The full engine response, so a verdict can be re-rendered exactly later
    # without recomputing it and risking a different answer.
    result_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")

    # Marks demonstration data so it is never mistaken for a real finding.
    is_sample: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        UtcDateTime(), default=_utcnow, nullable=False, index=True
    )
    duration_ms: Mapped[float | None] = mapped_column()

    user: Mapped["User | None"] = relationship(back_populates="analyses")

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return (
            f"<Analysis id={self.id} kind={self.kind.value} "
            f"score={self.risk_score} level={self.risk_level.value}>"
        )