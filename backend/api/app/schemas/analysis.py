"""Analysis request and response models.

The response mirrors what the detection engine actually produced. Two fields
carry deliberate honesty requirements:

- ``unavailable_signals`` lists checks that could not run, so the UI can show
  them instead of implying a full clean bill of health.
- ``is_simulated`` and ``persisted`` state plainly when a verdict was heuristic
  or when it could not be saved.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import ApiModel

__all__ = [
    "AnalyseMessageRequest",
    "AnalyseUrlRequest",
    "IndicatorResponse",
    "SignalResponse",
    "AnalysisResponse",
    "AnalysisSummary",
    "AnalysisKindLiteral",
    "RiskLevelLiteral",
]

AnalysisKindLiteral = Literal["message", "url", "image"]
RiskLevelLiteral = Literal["SAFE", "SUSPICIOUS", "DANGEROUS"]


class AnalyseMessageRequest(BaseModel):
    """Submitted message text."""

    message: str = Field(
        min_length=1,
        max_length=20000,
        description="The message, SMS or email body to analyse.",
    )
    sender_email: str | None = Field(
        default=None,
        max_length=320,
        description="Optional From address, used to check for sender spoofing.",
    )
    save: bool = Field(
        default=True,
        description="Persist to history when the request is authenticated.",
    )

    @field_validator("message")
    @classmethod
    def _reject_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Message must not be blank.")
        return stripped

    @field_validator("sender_email")
    @classmethod
    def _clean_sender(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip().lower()
        if not cleaned:
            return None
        if "@" not in cleaned or cleaned.startswith("@") or cleaned.endswith("@"):
            raise ValueError("sender_email must be a valid email address.")
        return cleaned


class AnalyseUrlRequest(BaseModel):
    """A single URL to analyse."""

    url: str = Field(min_length=1, max_length=2048)
    save: bool = True

    @field_validator("url")
    @classmethod
    def _validate_url(cls, value: str) -> str:
        """Accept only absolute web addresses.

        Two things are checked here rather than in the engine. First, a value
        with no scheme or host is not a link anyone could have clicked, so
        accepting it only produces a confusing empty verdict. Second, a
        ``javascript:`` or ``data:`` address is echoed back in
        ``detected_urls`` for the UI to render as a link, so accepting one
        would hand a caller a script-execution vector against our own frontend.
        Restricting to ``http``/``https`` keeps that field safe to display.
        """
        stripped = value.strip()
        if not stripped:
            raise ValueError("URL must not be blank.")

        try:
            parts = urlsplit(stripped)
        except ValueError as exc:
            raise ValueError(f"URL could not be parsed: {exc}") from None

        if parts.scheme.lower() not in ("http", "https"):
            raise ValueError("Only http:// and https:// addresses can be analysed.")
        if not parts.netloc:
            raise ValueError("URL must include a host, for example https://example.com.")

        return stripped


class IndicatorResponse(BaseModel):
    """One explainable finding."""

    type: str
    severity: Literal["info", "low", "medium", "high", "critical"]
    description: str = Field(description="Rendered verbatim in the UI.")
    evidence: str | None = None
    weight: float
    simulated: bool = False


class SignalResponse(BaseModel):
    """One signal family's contribution."""

    family: str
    score: float
    available: bool
    simulated: bool
    reason: str | None = Field(
        default=None, description="Why the check could not run, when unavailable."
    )


class AnalysisResponse(BaseModel):
    """A complete analysis result."""

    id: uuid.UUID | None = Field(
        default=None, description="Present when the result was stored."
    )
    kind: AnalysisKindLiteral
    risk_score: int = Field(ge=0, le=100)
    risk_level: RiskLevelLiteral
    explanation: str
    has_critical_indicator: bool
    is_simulated: bool = Field(
        description="True when any signal was heuristic rather than sourced."
    )
    persisted: bool = Field(
        description="False when the result could not be stored."
    )
    strongest_signal: str | None = None
    corroborating_signals: list[str] = Field(default_factory=list)
    unavailable_signals: list[str] = Field(
        default_factory=list,
        description="Checks that could not run. A missing check is never "
        "presented as a passed check.",
    )
    indicators: list[IndicatorResponse] = Field(default_factory=list)
    signals: list[SignalResponse] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)
    detected_urls: list[str] = Field(default_factory=list)
    detected_emails: list[str] = Field(default_factory=list)
    engine_version: str
    timings_ms: dict[str, float] = Field(default_factory=dict)
    risk_policy: dict[str, Any] = Field(
        default_factory=dict, description="Thresholds in force for this verdict."
    )
    created_at: datetime


class AnalysisSummary(ApiModel):
    """A history row, without the full verdict body."""

    id: uuid.UUID
    kind: AnalysisKindLiteral
    risk_score: int
    risk_level: RiskLevelLiteral
    has_critical_indicator: bool
    is_simulated: bool
    is_sample: bool = Field(
        default=False, description="Demonstration data, not a real finding."
    )
    excerpt: str = Field(description="First 160 characters of the input.")
    created_at: datetime