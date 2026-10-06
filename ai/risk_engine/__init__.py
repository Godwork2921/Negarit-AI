"""Calibrated risk scoring and explainability.

Combines the signals produced by the phishing, URL, sender, threat-intel and
image detectors into a single 0-100 score, assigns a verdict band from
configuration, and writes the explanation and recommended actions shown to the
user.
"""

from __future__ import annotations

from .explanation import build_explanation, family_label, recommend_actions
from .scoring import RiskAssessment, aggregate, assess, collect_signals
from .thresholds import DEFAULT_WEIGHTS, RiskConfig, load_risk_config

__all__ = [
    "assess",
    "aggregate",
    "collect_signals",
    "RiskAssessment",
    "RiskConfig",
    "DEFAULT_WEIGHTS",
    "load_risk_config",
    "build_explanation",
    "recommend_actions",
    "family_label",
]