"""Aggregate signal scores into a single, calibrated 0-100 risk score.

The aggregation model is deliberately simple and auditable:

1. **Strongest signal.** The score starts from the worst single family, so one
   decisive finding is never averaged away by quiet families.
2. **Bounded corroboration.** Independent agreeing families move the score
   toward 1 with diminishing returns:

   .. math::

       gain = 1 - \\frac{1}{1 + k \\cdot (n_{agree}-1) \\cdot share}

   The family weights enter through ``share``, so agreement between the
   families that matter counts for more. Because ``gain`` is bounded by 1,
   corroboration refines the verdict but can never manufacture one.
3. **Critical uplift.** Any CRITICAL indicator adds a small, proportionally
   bounded bonus.

Two properties matter for a security product and are enforced here:

- A family that could not be evaluated contributes nothing and is reported as
  unavailable. Missing evidence never lowers the risk.
- Nothing ever subtracts. Absence of a reputation hit is not evidence of
  safety.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass

from shared.types import (
    DetectorResult,
    Indicator,
    RiskLevel,
    Severity,
    SignalFamily,
    SignalScore,
    clamp_unit,
)

from .thresholds import RiskConfig

__all__ = ["RiskAssessment", "assess", "aggregate"]


@dataclass(frozen=True, slots=True)
class RiskAssessment:
    """The outcome of combining every available signal."""

    score: int
    level: RiskLevel
    signals: dict[SignalFamily, SignalScore]
    indicators: tuple[Indicator, ...]
    strongest_family: SignalFamily | None
    corroborating_families: tuple[SignalFamily, ...]
    unavailable_families: tuple[SignalFamily, ...]
    has_critical: bool
    config: RiskConfig

    @property
    def is_simulated(self) -> bool:
        """True when any contributing signal was not backed by real data."""
        return any(s.simulated for s in self.signals.values() if s.available)

    def to_dict(self) -> dict[str, object]:
        return {
            "risk_score": self.score,
            "risk_level": self.level.value,
            "strongest_signal": self.strongest_family.value if self.strongest_family else None,
            "corroborating_signals": [f.value for f in self.corroborating_families],
            "unavailable_signals": [f.value for f in self.unavailable_families],
            "has_critical_indicator": self.has_critical,
            "signals": {
                family.value: signal.to_dict() for family, signal in self.signals.items()
            },
        }


def collect_signals(
    results: Sequence[DetectorResult],
    extra: Mapping[SignalFamily, SignalScore] | None = None,
) -> dict[SignalFamily, SignalScore]:
    """Merge detector outputs and explicit overrides into one signal table."""
    signals: dict[SignalFamily, SignalScore] = {}
    for result in results:
        signals[result.family] = result.as_signal()
    if extra:
        for family, signal in extra.items():
            signals[family] = signal
    return signals


def _corroboration_gain(
    agreeing: Sequence[SignalFamily],
    config: RiskConfig,
) -> float:
    """Bounded 0-1 reward for independent families agreeing."""
    if len(agreeing) < 2:
        return 0.0
    agreeing_weight = sum(config.weights.get(family, 0.0) for family in agreeing)
    denominator = config.top_pair_weight or 1.0
    share = agreeing_weight / denominator
    strength = config.corroboration_strength * (len(agreeing) - 1) * share
    return 1.0 - (1.0 / (1.0 + strength))


def aggregate(
    signals: Mapping[SignalFamily, SignalScore],
    indicators: Iterable[Indicator],
    config: RiskConfig,
) -> RiskAssessment:
    """Combine signals and indicators into a :class:`RiskAssessment`."""
    available = {f: s for f, s in signals.items() if s.available}
    unavailable = tuple(f for f, s in signals.items() if not s.available)

    strongest_family = max(available, key=lambda f: available[f].score, default=None)
    strongest = available[strongest_family].score if strongest_family else 0.0

    corroborating = tuple(
        family
        for family in sorted(available, key=lambda f: available[f].score, reverse=True)
        if available[family].score >= config.agreement_threshold
    )

    gain = _corroboration_gain(corroborating, config)
    score01 = strongest + (1.0 - strongest) * gain

    collected = tuple(indicators)
    has_critical = any(i.severity is Severity.CRITICAL for i in collected)
    if has_critical:
        score01 += config.critical_bonus * (1.0 - score01)

    score = int(round(clamp_unit(score01) * 100))
    return RiskAssessment(
        score=score,
        level=config.classify(score),
        signals=dict(signals),
        indicators=collected,
        strongest_family=strongest_family,
        corroborating_families=corroborating,
        unavailable_families=unavailable,
        has_critical=has_critical,
        config=config,
    )


def assess(
    results: Sequence[DetectorResult] = (),
    *,
    extra_signals: Mapping[SignalFamily, SignalScore] | None = None,
    config: RiskConfig | None = None,
) -> RiskAssessment:
    """Assess the combined risk of a set of detector results.

    Args:
        results: Outputs from whichever detectors ran for this input.
        extra_signals: Explicit signals for families with no detector, such as
            a threat-intelligence lookup that was skipped or a family that
            genuinely could not be evaluated.
        config: Active scoring policy. Defaults to the documented values.

    Returns:
        A :class:`RiskAssessment` carrying the score, band and the evidence
        used to reach it.
    """
    policy = config or RiskConfig()
    signals = collect_signals(results, extra_signals)
    indicators = [indicator for result in results for indicator in result.indicators]
    return aggregate(signals, indicators, policy)