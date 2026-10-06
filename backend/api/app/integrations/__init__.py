"""Adapters to systems outside this service.

Each module here wraps a third party or another process behind a small,
stable interface, so the rest of the backend depends on that interface rather
than on the external system's shape.
"""

from __future__ import annotations

from .ai_engine import (
    AnalysisOutcome,
    EngineUnavailable,
    RiskLevel,
    SignalDetail,
    analyse_message,
    analyse_url,
    engine_info,
)

__all__ = [
    "AnalysisOutcome",
    "EngineUnavailable",
    "RiskLevel",
    "SignalDetail",
    "analyse_message",
    "analyse_url",
    "engine_info",
]