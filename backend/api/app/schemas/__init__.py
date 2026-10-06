"""Pydantic request and response models.

Every endpoint declares its input and output here. ORM objects are never
returned directly, so adding a column cannot accidentally expose it.
"""

from __future__ import annotations

from .analysis import (
    AnalysisKindLiteral,
    AnalysisResponse,
    AnalysisSummary,
    AnalyseMessageRequest,
    AnalyseUrlRequest,
    IndicatorResponse,
    RiskLevelLiteral,
    SignalResponse,
)
from .auth import (
    AuthResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
    UserResponse,
    UserSummary,
)
from .common import (
    ApiModel,
    ErrorBody,
    ErrorDetail,
    ErrorResponse,
    MessageResponse,
    Page,
    PageMeta,
)

__all__ = [
    "ApiModel",
    "MessageResponse",
    "Page",
    "PageMeta",
    "ErrorBody",
    "ErrorDetail",
    "ErrorResponse",
    "RegisterRequest",
    "LoginRequest",
    "RefreshRequest",
    "TokenPair",
    "AuthResponse",
    "UserResponse",
    "UserSummary",
    "AnalyseMessageRequest",
    "AnalyseUrlRequest",
    "AnalysisResponse",
    "AnalysisSummary",
    "IndicatorResponse",
    "SignalResponse",
    "AnalysisKindLiteral",
    "RiskLevelLiteral",
]