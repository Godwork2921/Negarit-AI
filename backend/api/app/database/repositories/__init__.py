"""Database access.

Repositories own every query. Keeping SQL in one layer means the routers and
services stay free of persistence concerns and the query surface can be
reviewed on its own.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Analysis, AnalysisKind, RefreshToken, RiskLevel, User
from app.schemas.analysis import AnalysisSummary

__all__ = ["UserRepository", "RefreshTokenRepository", "AnalysisRepository"]


class UserRepository:
    """Queries against ``users``."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def get_by_email(self, email: str) -> User | None:
        statement = select(User).where(func.lower(User.email) == email.lower())
        return self._session.execute(statement).scalar_one_or_none()

    def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return self._session.get(User, user_id)

    def create(
        self,
        *,
        email: str,
        password_hash: str,
        full_name: str | None = None,
        is_admin: bool = False,
    ) -> User:
        user = User(
            email=email.strip().lower(),
            password_hash=password_hash,
            full_name=full_name,
            is_admin=is_admin,
        )
        self._session.add(user)
        self._session.flush()
        return user

    def exists(self, email: str) -> bool:
        statement = select(func.count()).select_from(User).where(
            func.lower(User.email) == email.lower()
        )
        return bool(self._session.execute(statement).scalar_one())

    def touch_login(self, user: User) -> None:
        user.last_login_at = datetime.now(timezone.utc)
        self._session.flush()


class RefreshTokenRepository:
    """Queries against ``refresh_tokens``."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def create(
        self,
        *,
        user_id: uuid.UUID,
        token_hash: str,
        expires_at: datetime,
        user_agent: str | None = None,
        client_ip: str | None = None,
    ) -> RefreshToken:
        row = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            user_agent=(user_agent or "")[:400] or None,
            client_ip=(client_ip or "")[:64] or None,
        )
        self._session.add(row)
        self._session.flush()
        return row

    def get_by_hash(self, token_hash: str) -> RefreshToken | None:
        statement = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        return self._session.execute(statement).scalar_one_or_none()

    def revoke(self, row: RefreshToken) -> None:
        if row.revoked_at is None:
            row.revoked_at = datetime.now(timezone.utc)
            self._session.flush()

    def revoke_all_for_user(self, user_id: uuid.UUID) -> int:
        statement = select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        )
        rows: Sequence[RefreshToken] = self._session.execute(statement).scalars().all()
        now = datetime.now(timezone.utc)
        for row in rows:
            row.revoked_at = now
        self._session.flush()
        return len(rows)


class AnalysisRepository:
    """Queries against ``analyses``."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def create(
        self,
        *,
        user_id: uuid.UUID | None,
        kind: AnalysisKind,
        input_text: str,
        risk_score: int,
        risk_level: RiskLevel,
        explanation: str,
        has_critical_indicator: bool,
        is_simulated: bool,
        result_json: str,
        sender_email: str | None = None,
        is_sample: bool = False,
        duration_ms: float | None = None,
    ) -> Analysis:
        row = Analysis(
            user_id=user_id,
            kind=kind,
            input_text=input_text,
            sender_email=sender_email,
            risk_score=risk_score,
            risk_level=risk_level,
            explanation=explanation,
            has_critical_indicator=has_critical_indicator,
            is_simulated=is_simulated,
            result_json=result_json,
            is_sample=is_sample,
            duration_ms=duration_ms,
        )
        self._session.add(row)
        self._session.flush()
        return row

    def get_for_user(self, analysis_id: uuid.UUID, user_id: uuid.UUID) -> Analysis | None:
        """Fetch one analysis, scoped to its owner.

        The user filter is part of the query rather than a check afterwards, so
        another user's identifier can never be read by omission.
        """
        statement = select(Analysis).where(
            Analysis.id == analysis_id, Analysis.user_id == user_id
        )
        return self._session.execute(statement).scalar_one_or_none()

    def list_for_user(
        self,
        user_id: uuid.UUID,
        *,
        limit: int,
        offset: int,
        level: RiskLevel | None = None,
        kind: AnalysisKind | None = None,
    ) -> tuple[Sequence[Analysis], int]:
        conditions = [Analysis.user_id == user_id]
        if level is not None:
            conditions.append(Analysis.risk_level == level)
        if kind is not None:
            conditions.append(Analysis.kind == kind)

        total = self._session.execute(
            select(func.count()).select_from(Analysis).where(*conditions)
        ).scalar_one()

        rows = self._session.execute(
            select(Analysis)
            .where(*conditions)
            .order_by(Analysis.created_at.desc())
            .limit(limit)
            .offset(offset)
        ).scalars().all()
        return rows, total

    @staticmethod
    def summarise(row: Analysis) -> AnalysisSummary:
        excerpt = row.input_text.strip().replace("\n", " ")
        if len(excerpt) > 160:
            excerpt = excerpt[:157] + "..."
        return AnalysisSummary(
            id=row.id,
            kind=row.kind.value,
            risk_score=row.risk_score,
            risk_level=row.risk_level.value,
            has_critical_indicator=row.has_critical_indicator,
            is_simulated=row.is_simulated,
            is_sample=row.is_sample,
            excerpt=excerpt,
            created_at=row.created_at,
        )

    def counts_by_level(self, user_id: uuid.UUID) -> dict[str, int]:
        statement = (
            select(Analysis.risk_level, func.count())
            .where(Analysis.user_id == user_id)
            .group_by(Analysis.risk_level)
        )
        return {
            level.value if hasattr(level, "value") else str(level): count
            for level, count in self._session.execute(statement).all()
        }