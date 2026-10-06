"""Configurable thresholds and weights for the risk engine.

Every business rule about what counts as dangerous lives here, driven by the
environment. No threshold is written as a literal inside scoring logic, so
the whole policy can be retuned without touching the detectors.
"""

from __future__ import annotations

import math
import os
from collections.abc import Mapping

from shared.types import RiskLevel, SignalFamily

__all__ = [
    "RiskConfig",
    "DEFAULT_WEIGHTS",
    "load_risk_config",
    "clamp_band",
]

DEFAULT_WEIGHTS: dict[SignalFamily, float] = {
    SignalFamily.PHISHING: 0.30,
    SignalFamily.URL: 0.25,
    SignalFamily.THREAT_INTEL: 0.20,
    SignalFamily.SENDER: 0.15,
    SignalFamily.IMAGE: 0.10,
}

DEFAULT_SAFE_MAX = 29.0
DEFAULT_SUSPICIOUS_MAX = 69.0
DEFAULT_AGREEMENT_THRESHOLD = 0.50
DEFAULT_CORROBORATION_STRENGTH = 0.35
DEFAULT_CRITICAL_BONUS = 0.02


def clamp_band(value: float, safe_max: float, suspicious_max: float) -> float:
    """Clamp a score or band boundary into 0-100 and inside the given bands.

    The band arguments are normalised first, so a caller that clamps a score
    always gets a value that its own band definition can actually classify.
    """
    safe_max = max(0.0, min(safe_max, DEFAULT_SUSPICIOUS_MAX))
    suspicious_max = max(safe_max + 1.0, min(suspicious_max, 100.0))
    return max(0.0, min(value, suspicious_max))


class RiskConfig:
    """Scoring policy.

    Attributes:
        safe_max: Upper bound (inclusive) of the ``SAFE`` band.
        suspicious_max: Upper bound (inclusive) of the ``SUSPICIOUS`` band.
        weights: Relative importance of each signal family.
        agreement_threshold: A family counts as corroborating at or above this.
        corroboration_strength: How much agreement between families matters.
        critical_bonus: Small uplift when any CRITICAL indicator fired.
    """

    __slots__ = (
        "safe_max",
        "suspicious_max",
        "weights",
        "agreement_threshold",
        "corroboration_strength",
        "critical_bonus",
    )

    def __init__(
        self,
        *,
        safe_max: float = DEFAULT_SAFE_MAX,
        suspicious_max: float = DEFAULT_SUSPICIOUS_MAX,
        weights: Mapping[SignalFamily, float] | None = None,
        agreement_threshold: float = DEFAULT_AGREEMENT_THRESHOLD,
        corroboration_strength: float = DEFAULT_CORROBORATION_STRENGTH,
        critical_bonus: float = DEFAULT_CRITICAL_BONUS,
    ) -> None:
        # The bands are normalised rather than trusted, so a misconfigured
        # deployment can never invert or overlap them: SAFE starts at 0,
        # SUSPICIOUS always has room above SAFE, and DANGEROUS takes the rest.
        self.safe_max = clamp_band(safe_max, 0.0, DEFAULT_SUSPICIOUS_MAX)
        self.suspicious_max = clamp_band(suspicious_max, 0.0, 100.0)
        if self.suspicious_max <= self.safe_max:
            self.suspicious_max = self.safe_max + 1.0
        self.weights = dict(weights or DEFAULT_WEIGHTS)
        self.agreement_threshold = clamp_band(agreement_threshold, 0.0, 1.0)
        self.corroboration_strength = clamp_band(corroboration_strength, 0.0, 1.0)
        self.critical_bonus = clamp_band(critical_bonus, 0.0, 1.0)

    @property
    def top_pair_weight(self) -> float:
        """Combined weight of the two most important families."""
        ranked = sorted(self.weights.values(), reverse=True)
        return (ranked[0] if ranked else 0.0) + (ranked[1] if len(ranked) > 1 else 0.0)

    def classify(self, score: float) -> RiskLevel:
        """Map a 0-100 score onto a verdict band."""
        if score <= self.safe_max:
            return RiskLevel.SAFE
        if score <= self.suspicious_max:
            return RiskLevel.SUSPICIOUS
        return RiskLevel.DANGEROUS

    def describe(self) -> dict[str, object]:
        """Serialise the active policy for the API response and audit logs."""
        return {
            "safe_max": self.safe_max,
            "suspicious_max": self.suspicious_max,
            "agreement_threshold": self.agreement_threshold,
            "corroboration_strength": self.corroboration_strength,
            "critical_bonus": self.critical_bonus,
            "weights": {family.value: weight for family, weight in self.weights.items()},
        }

    def __repr__(self) -> str:
        return (
            f"RiskConfig(safe_max={self.safe_max}, "
            f"suspicious_max={self.suspicious_max}, weights={len(self.weights)})"
        )


def _float(
    env: Mapping[str, str],
    key: str,
    default: float,
    minimum: float,
    maximum: float,
) -> float:
    """Read a bounded number, falling back to the default when unusable.

    Out-of-range and non-finite values are rejected rather than clamped. A
    deployment mistake such as ``RISK_SAFE_MAX=-5`` should degrade to the known
    good policy, not silently become a policy nobody reviewed.
    """
    raw = env.get(key)
    if raw is None or raw.strip() == "":
        return default
    try:
        value = float(raw)
    except ValueError:
        return default
    if not math.isfinite(value) or not minimum <= value <= maximum:
        return default
    return value


def load_risk_config(env: Mapping[str, str] | None = None) -> RiskConfig:
    """Build a :class:`RiskConfig` from environment variables.

    Unparseable or out-of-range values fall back to the documented defaults
    rather than raising, so a typo in deployment configuration degrades to a
    known-good policy instead of taking the service down.
    """
    source = os.environ if env is None else env
    weights = {
        family: _float(
            source, f"RISK_WEIGHT_{family.value.upper()}", weight, 0.0, 1.0
        )
        for family, weight in DEFAULT_WEIGHTS.items()
    }
    return RiskConfig(
        safe_max=_float(source, "RISK_SAFE_MAX", DEFAULT_SAFE_MAX, 0.0, 100.0),
        suspicious_max=_float(
            source, "RISK_SUSPICIOUS_MAX", DEFAULT_SUSPICIOUS_MAX, 0.0, 100.0
        ),
        weights=weights,
        agreement_threshold=_float(
            source,
            "RISK_AGREEMENT_THRESHOLD",
            DEFAULT_AGREEMENT_THRESHOLD,
            0.0,
            1.0,
        ),
        corroboration_strength=_float(
            source,
            "RISK_CORROBORATION_STRENGTH",
            DEFAULT_CORROBORATION_STRENGTH,
            0.0,
            1.0,
        ),
        critical_bonus=_float(
            source, "RISK_CRITICAL_BONUS", DEFAULT_CRITICAL_BONUS, 0.0, 1.0
        ),
    )