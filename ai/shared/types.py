"""Shared types for every Negarit AI detector.

This module is the single contract between the detectors in ``ai/`` and the
risk engine that consumes them. It deliberately has no third-party
dependencies and performs no I/O, so any detector can be imported and tested
in isolation.

Two honesty guarantees are encoded here:

* :class:`SignalScore` records whether a signal family was actually
  evaluated, so a skipped check is never silently reported as clean.
* :class:`Indicator` carries a ``simulated`` flag, marking any finding not
  backed by a real model or live reputation data.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from enum import Enum

__all__ = [
    "Severity",
    "SEVERITY_WEIGHT",
    "SEVERITY_FLOOR",
    "severity_floor",
    "SEVERITY_ORDER",
    "SignalFamily",
    "Indicator",
    "SignalScore",
    "DetectorResult",
    "ReputationResult",
    "RiskLevel",
    "clamp_unit",
]


def clamp_unit(value: float) -> float:
    """Clamp ``value`` into the closed interval [0.0, 1.0]."""
    if value != value:
        return 0.0
    return max(0.0, min(1.0, float(value)))


class Severity(str, Enum):
    """How serious a single finding is."""

    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


SEVERITY_ORDER: tuple[Severity, ...] = (
    Severity.INFO,
    Severity.LOW,
    Severity.MEDIUM,
    Severity.HIGH,
    Severity.CRITICAL,
)

SEVERITY_WEIGHT: dict[Severity, float] = {
    Severity.INFO: 0.00,
    Severity.LOW: 0.10,
    Severity.MEDIUM: 0.22,
    Severity.HIGH: 0.40,
    Severity.CRITICAL: 0.62,
}

SEVERITY_FLOOR: dict[Severity, float] = {
    Severity.INFO: 0.00,
    Severity.LOW: 0.00,
    Severity.MEDIUM: 0.00,
    Severity.HIGH: 0.00,
    Severity.CRITICAL: 0.75,
}


def severity_floor(indicators: "Sequence[Indicator]") -> float:
    """Minimum score implied by the worst severity present.

    A saturating weighted sum can leave a single CRITICAL finding below the
    malicious band, because 0.62 of accumulated weight does not saturate far
    enough on its own. Findings that are conclusive on their own — a
    confirmed brand typosquat, a request for credentials — establish a floor
    so that severity is never understated.
    """
    return max((SEVERITY_FLOOR[i.severity] for i in indicators), default=0.0)


class SignalFamily(str, Enum):
    """The five independent evidence streams the risk engine combines."""

    PHISHING = "phishing"
    URL = "url"
    SENDER = "sender"
    THREAT_INTEL = "threat_intel"
    IMAGE = "image"


class RiskLevel(str, Enum):
    """Verdict bands produced by the risk engine."""

    SAFE = "SAFE"
    SUSPICIOUS = "SUSPICIOUS"
    DANGEROUS = "DANGEROUS"


class ReputationVerdict(str, Enum):
    """Outcome of a third-party reputation lookup."""

    MALICIOUS = "malicious"
    SUSPICIOUS = "suspicious"
    CLEAN = "clean"
    UNLISTED = "unlisted"
    UNKNOWN = "unknown"


@dataclass(frozen=True, slots=True)
class ReputationResult:
    """A verdict returned by a threat-intelligence provider.

    This type is defined inside ``ai/`` so the engine stays independent of any
    particular provider. The backend adapts a provider's response into this
    shape, which keeps all HTTP concerns out of the detection code.
    """

    verdict: ReputationVerdict
    source: str
    detail: str | None = None
    detections: int = 0
    raw_reference: str | None = None

    @property
    def risk(self) -> float:
        """Map the verdict onto a 0-1 risk contribution."""
        return {
            ReputationVerdict.MALICIOUS: 1.0,
            ReputationVerdict.SUSPICIOUS: 0.6,
            ReputationVerdict.CLEAN: 0.0,
            ReputationVerdict.UNLISTED: 0.25,
            ReputationVerdict.UNKNOWN: 0.0,
        }[self.verdict]


@dataclass(frozen=True, slots=True)
class Indicator:
    """One explainable finding.

    An indicator is the unit of explainability in this platform: the risk
    engine scores them, and the user interface renders them verbatim.
    """

    type: str
    severity: Severity
    description: str
    evidence: str | None = None
    weight: float | None = None
    simulated: bool = False
    metadata: dict[str, object] = field(default_factory=dict)

    @property
    def effective_weight(self) -> float:
        """Severity-derived weight, unless the detector supplied its own."""
        if self.weight is not None:
            return self.weight
        return SEVERITY_WEIGHT[self.severity]

    def to_dict(self) -> dict[str, object]:
        """Serialise for the API response."""
        return {
            "type": self.type,
            "severity": self.severity.value,
            "description": self.description,
            "evidence": self.evidence,
            "weight": round(self.effective_weight, 4),
            "simulated": self.simulated,
        }


@dataclass(frozen=True, slots=True)
class SignalScore:
    """A signal family's contribution, including whether it was evaluated.

    ``score`` is ``None`` when ``available`` is ``False``. Callers must not
    treat an unavailable signal as zero-risk; absence of evidence is not
    evidence of safety.
    """

    family: SignalFamily
    score: float
    available: bool = True
    reason: str | None = None
    simulated: bool = False

    @classmethod
    def unavailable(
        cls,
        family: SignalFamily,
        reason: str,
        *,
        simulated: bool = False,
    ) -> SignalScore:
        return cls(
            family=family,
            score=0.0,
            available=False,
            reason=reason,
            simulated=simulated,
        )

    def to_dict(self) -> dict[str, object]:
        return {
            "available": self.available,
            "score": round(self.score, 4) if self.available else None,
            "reason": self.reason,
            "simulated": self.simulated,
        }


@dataclass(frozen=True, slots=True)
class DetectorResult:
    """Uniform return value of every detector in ``ai/``."""

    family: SignalFamily
    classification: str
    confidence: float
    indicators: tuple[Indicator, ...]
    score: float
    simulated: bool = False
    metadata: dict[str, object] = field(default_factory=dict)
    analysable: bool = True

    @property
    def has_critical(self) -> bool:
        return any(i.severity is Severity.CRITICAL for i in self.indicators)

    @property
    def highest_severity(self) -> Severity:
        if not self.indicators:
            return Severity.INFO
        return max((i.severity for i in self.indicators), key=SEVERITY_ORDER.index)

    def as_signal(self) -> SignalScore:
        """Present this result to the risk engine as a single signal.

        A detector that could not evaluate its input must not present a zero
        score, because a zero would be read as evidence of safety. Such a
        result is handed over as explicitly unavailable instead, so the risk
        engine can report the gap rather than hide it.
        """
        if not self.analysable:
            return SignalScore.unavailable(
                self.family,
                self.metadata.get("analysis_blocked_reason")
                or "the input could not be analysed",
            )
        return SignalScore(
            family=self.family,
            score=self.score,
            available=True,
            simulated=self.simulated,
        )