"""Phishing-language detection.

Deterministic, offline-capable scoring of message text against an explainable
rule library. See :mod:`detector` for the scoring function and
:mod:`lexicon` for the rule data.
"""

from __future__ import annotations

from .detector import (
    PHISHING_CUTOFF,
    SENSITIVITY,
    SUSPICIOUS_CUTOFF,
    analyse,
)
from .lexicon import BRANDS, RULES, Rule

__all__ = [
    "analyse",
    "Rule",
    "RULES",
    "BRANDS",
    "SENSITIVITY",
    "PHISHING_CUTOFF",
    "SUSPICIOUS_CUTOFF",
]