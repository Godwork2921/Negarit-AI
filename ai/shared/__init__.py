"""Shared vocabulary and helpers used across the ``ai`` package."""

from __future__ import annotations

from .types import (
    SEVERITY_FLOOR,
    SEVERITY_ORDER,
    SEVERITY_WEIGHT,
    DetectorResult,
    Indicator,
    ReputationResult,
    ReputationVerdict,
    RiskLevel,
    Severity,
    SignalFamily,
    SignalScore,
    clamp_unit,
    severity_floor,
)

__all__ = [
    "SEVERITY_FLOOR",
    "SEVERITY_ORDER",
    "SEVERITY_WEIGHT",
    "DetectorResult",
    "Indicator",
    "ReputationResult",
    "ReputationVerdict",
    "RiskLevel",
    "Severity",
    "SignalFamily",
    "SignalScore",
    "clamp_unit",
    "severity_floor",
]