"""Analysis orchestration.

This service is the boundary between HTTP and the detection engine. It converts
the engine's dataclasses into API responses, and it decides what happens when
storage is unavailable: analysis still runs, and the response says plainly
that the result was not saved rather than pretending it was.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import Settings
from app.database.repositories import AnalysisRepository
from app.exceptions import NotFound
from app.integrations import AnalysisOutcome, analyse_message as run_message
from app.integrations import analyse_url as run_url
from app.models import AnalysisKind
# The integration layer has its own ``RiskLevel`` enum describing the engine's
# verdict, and the ORM has another describing a stored column. They happen to
# share member names today, but passing one where the other is expected is a
# silent type error waiting for the two to drift, so the stored form is always
# built explicitly from the plain string value.
from app.models import RiskLevel as StoredRiskLevel
from app.schemas.analysis import (
    AnalysisResponse,
    AnalysisSummary,
    IndicatorResponse,
    SignalResponse,
)

__all__ = ["AnalysisService"]

logger = logging.getLogger("negarit.api.services.analysis")


def _to_response(
    outcome: AnalysisOutcome,
    *,
    kind: str,
    persisted: bool,
    analysis_id: uuid.UUID | None,
    risk_policy: dict[str, Any],
    created_at: datetime,
) -> AnalysisResponse:
    return AnalysisResponse(
        id=analysis_id,
        kind=kind,  # type: ignore[arg-type]
        risk_score=outcome.score,
        risk_level=outcome.level.value,  # type: ignore[arg-type]
        explanation=outcome.explanation,
        has_critical_indicator=outcome.has_critical,
        is_simulated=outcome.simulated,
        persisted=persisted,
        strongest_signal=outcome.strongest_family,
        corroborating_signals=list(outcome.corroborating_families),
        unavailable_signals=list(outcome.unavailable_families),
        indicators=[
            IndicatorResponse(
                type=item["type"],
                severity=item["severity"],  # type: ignore[arg-type]
                description=item["description"],
                evidence=item.get("evidence"),
                weight=item.get("weight", 0.0),
                simulated=item.get("simulated", False),
            )
            for item in outcome.indicators
        ],
        signals=[
            SignalResponse(
                family=signal.family,
                score=signal.score,
                available=signal.available,
                simulated=signal.simulated,
                reason=signal.reason,
            )
            for signal in outcome.signals
        ],
        recommended_actions=list(outcome.actions),
        detected_urls=list(outcome.detected_urls),
        detected_emails=list(outcome.detected_emails),
        engine_version=outcome.engine_version,
        timings_ms=dict(outcome.timings_ms),
        risk_policy=risk_policy,
        created_at=created_at,
    )


class AnalysisService:
    """Runs analysis and, when possible, records the result."""

    def __init__(self, settings: Settings, session: Session | None = None) -> None:
        self._settings = settings
        self._session = session
        self._repository = AnalysisRepository(session) if session is not None else None

    # ── Persistence ─────────────────────────────────────────────────

    def _persist(
        self,
        *,
        user_id: uuid.UUID | None,
        kind: AnalysisKind,
        input_text: str,
        outcome: AnalysisOutcome,
        sender_email: str | None = None,
        is_sample: bool = False,
    ) -> tuple[uuid.UUID | None, bool]:
        """Store a result, tolerating storage failure.

        A verdict the user cannot see again is far less useful than a correct
        verdict they have to run twice, so a storage failure downgrades the
        response instead of failing it.
        """
        if self._repository is None or user_id is None:
            return None, False

        duration = sum(outcome.timings_ms.values()) or None
        try:
            row = self._repository.create(
                user_id=user_id,
                kind=kind,
                input_text=input_text,
                sender_email=sender_email,
                risk_score=outcome.score,
                risk_level=StoredRiskLevel(outcome.level.value),
                explanation=outcome.explanation,
                has_critical_indicator=outcome.has_critical,
                is_simulated=outcome.simulated,
                result_json=json.dumps(outcome.to_dict(), default=str),
                is_sample=is_sample,
                duration_ms=duration,
            )
            self._session.commit()  # type: ignore[union-attr]
            return row.id, True
        except SQLAlchemyError as exc:
            self._session.rollback()  # type: ignore[union-attr]
            logger.warning(
                "analysis_persist_failed detail=%s",
                type(exc).__name__,
            )
            return None, False

    # ── Operations ──────────────────────────────────────────────────

    def analyse_message(
        self,
        *,
        message: str,
        sender_email: str | None = None,
        user_id: uuid.UUID | None = None,
        save: bool = True,
    ) -> AnalysisResponse:
        outcome = run_message(
            message,
            sender_email=sender_email,
            risk_env=self._settings.risk_engine_env(),
        )
        analysis_id, persisted = (
            self._persist(
                user_id=user_id,
                kind=AnalysisKind.MESSAGE,
                input_text=message,
                outcome=outcome,
                sender_email=sender_email,
            )
            if save
            else (None, False)
        )

        logger.info(
            "analysis_complete",
            extra={
                "context": {
                    "analysis_id": str(analysis_id) if analysis_id else None,
                    "path": "analysis.message",
                    "risk_score": outcome.score,
                }
            },
        )
        return _to_response(
            outcome,
            kind="message",
            persisted=persisted,
            analysis_id=analysis_id,
            risk_policy=self._settings.risk_engine_env(),
            created_at=datetime.now(timezone.utc),
        )

    def analyse_url(
        self,
        *,
        url: str,
        user_id: uuid.UUID | None = None,
        save: bool = True,
    ) -> AnalysisResponse:
        outcome = run_url(url, risk_env=self._settings.risk_engine_env())
        analysis_id, persisted = (
            self._persist(
                user_id=user_id,
                kind=AnalysisKind.URL,
                input_text=url,
                outcome=outcome,
            )
            if save
            else (None, False)
        )

        logger.info(
            "analysis_complete",
            extra={
                "context": {
                    "analysis_id": str(analysis_id) if analysis_id else None,
                    "path": "analysis.url",
                    "risk_score": outcome.score,
                }
            },
        )
        return _to_response(
            outcome,
            kind="url",
            persisted=persisted,
            analysis_id=analysis_id,
            risk_policy=self._settings.risk_engine_env(),
            created_at=datetime.now(timezone.utc),
        )

    # ── Retrieval ───────────────────────────────────────────────────

    def get_analysis(
        self, analysis_id: uuid.UUID, *, user_id: uuid.UUID
    ) -> AnalysisResponse:
        """Fetch a stored result, returning the saved verdict verbatim.

        The stored JSON is replayed rather than recomputed, so a historical
        verdict cannot change because a detector was retuned afterwards.
        """
        if self._repository is None:
            raise NotFound("Stored analyses are unavailable.", code="storage_unavailable")

        row = self._repository.get_for_user(analysis_id, user_id)
        if row is None:
            raise NotFound("No analysis with that identifier was found for your account.")

        try:
            payload = json.loads(row.result_json)
        except (TypeError, ValueError):
            logger.warning("analysis_payload_unreadable analysis_id=%s", row.id)
            raise NotFound("That analysis result could not be read.") from None

        response = AnalysisResponse(
            id=row.id,
            kind=row.kind.value,
            risk_score=row.risk_score,
            risk_level=row.risk_level.value,
            explanation=row.explanation,
            has_critical_indicator=row.has_critical_indicator,
            is_simulated=row.is_simulated,
            persisted=True,
            strongest_signal=payload.get("strongest_signal"),
            corroborating_signals=payload.get("corroborating_signals", []),
            unavailable_signals=payload.get("unavailable_signals", []),
            indicators=payload.get("indicators", []),
            signals=payload.get("signals", []),
            recommended_actions=payload.get("recommended_actions", []),
            detected_urls=payload.get("detected_urls", []),
            detected_emails=payload.get("detected_emails", []),
            engine_version=payload.get("engine_version", "unknown"),
            timings_ms=payload.get("timings_ms", {}),
            risk_policy=self._settings.risk_engine_env(),
            created_at=row.created_at,
        )
        return response

    def list_history(
        self,
        *,
        user_id: uuid.UUID,
        limit: int,
        offset: int,
        level: str | None = None,
        kind: str | None = None,
    ) -> tuple[list[AnalysisSummary], int]:
        if self._repository is None:
            return [], 0

        rows, total = self._repository.list_for_user(
            user_id,
            limit=limit,
            offset=offset,
            level=StoredRiskLevel(level) if level else None,
            kind=AnalysisKind(kind) if kind else None,
        )
        return [AnalysisRepository.summarise(row) for row in rows], total