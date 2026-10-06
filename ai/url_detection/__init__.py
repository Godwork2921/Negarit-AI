"""Suspicious-URL detection.

Lexical, brand-impersonation and typosquatting analysis of a URL, plus an
optional reputation verdict supplied by the caller. No network access.
"""

from __future__ import annotations

from .detector import (
    HIGH_RISK_TLDS,
    MALICIOUS_CUTOFF,
    SENSITIVITY,
    SHORTENER_HOSTS,
    SUSPICIOUS_CUTOFF,
    analyse,
)
from .features import ParsedUrl, parse_url

__all__ = [
    "analyse",
    "parse_url",
    "ParsedUrl",
    "HIGH_RISK_TLDS",
    "SHORTENER_HOSTS",
    "SENSITIVITY",
    "MALICIOUS_CUTOFF",
    "SUSPICIOUS_CUTOFF",
]