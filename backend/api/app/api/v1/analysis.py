"""Threat analysis endpoints."""

from __future__ import annotations

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import CurrentUser, OptionalUser, get_analysis_service
from app.exceptions import AnalysisFailed, ValidationFailed
from app.schemas.analysis import (
    AnalysisResponse,
    AnalysisSummary,
    AnalyseMessageRequest,
    AnalyseUrlRequest,
)
from app.schemas.common import Page
from app.services import AnalysisService

__all__ = ["router"]

logger = logging.getLogger("negarit.api.v1.analysis")

router = APIRouter(prefix="/analysis", tags=["analysis"])

AnalysisServiceDep = Annotated[AnalysisService, Depends(get_analysis_service)]

_MAX_LIMIT = 100


@router.post(
    "/message",
    response_model=AnalysisResponse,
    summary="Analyse message text",
    responses={
        422: {"description": "The message is empty, too long, or could not be analysed."},
        429: {"description": "Rate limit reached for the analysis endpoints."},
    },
)
async def analyse_message(
    payload: AnalyseMessageRequest,
    service: AnalysisServiceDep,
    user: OptionalUser,
) -> AnalysisResponse:
    """Analyse a message, SMS or email body.

    Works without an account. If a bearer token is supplied the result is saved
    to that user's history; otherwise the verdict is returned and discarded.
    """
    return service.analyse_message(
        message=payload.message,
        sender_email=payload.sender_email,
        user_id=user.id if user else None,
        save=payload.save,
    )


@router.post(
    "/url",
    response_model=AnalysisResponse,
    summary="Analyse a single URL",
    responses={
        422: {"description": "The URL is empty, too long, or could not be parsed."},
        429: {"description": "Rate limit reached for the analysis endpoints."},
    },
)
async def analyse_url(
    payload: AnalyseUrlRequest,
    service: AnalysisServiceDep,
    user: OptionalUser,
) -> AnalysisResponse:
    """Analyse one URL.

    The address is parsed and inspected locally. It is never requested, so
    submitting a link cannot be used to make the service visit it.
    """
    return service.analyse_url(
        url=payload.url,
        user_id=user.id if user else None,
        save=payload.save,
    )


@router.post(
    "/image",
    summary="Analyse a screenshot",
    status_code=501,
    responses={501: {"description": "Image analysis is not implemented yet."}},
)
async def analyse_image() -> None:
    """Placeholder for screenshot analysis.

    Deliberately unimplemented. Returning a fabricated verdict, or accepting an
    upload and quietly returning text-only results, would misrepresent the
    capability. OCR and image forensics are tracked in ``ai/ocr/`` and
    ``ai/deepfake_detection/``.
    """
    raise AnalysisFailed(
        "Screenshot analysis is not available yet. Submit the message text or "
        "the URL from the screenshot instead.",
        code="image_analysis_unavailable",
        status_code=501,
    )


@router.get(
    "/{analysis_id}",
    response_model=AnalysisResponse,
    summary="Fetch a stored result",
    responses={
        401: {"description": "Authentication is required."},
        404: {"description": "No such analysis belongs to this account."},
    },
)
async def get_analysis(
    analysis_id: uuid.UUID,
    service: AnalysisServiceDep,
    user: CurrentUser,
) -> AnalysisResponse:
    """Return a stored verdict exactly as it was produced.

    Replaying the saved result rather than recomputing it keeps historical
    verdicts stable if the engine is retuned later.
    """
    return service.get_analysis(analysis_id, user_id=user.id)


@router.get(
    "/history/list",
    response_model=Page[AnalysisSummary],
    summary="Paginated scan history",
    responses={401: {"description": "Authentication is required."}},
)
async def list_history(
    user: CurrentUser,
    service: AnalysisServiceDep,
    limit: Annotated[int, Query(ge=1, le=_MAX_LIMIT)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    level: Annotated[str | None, Query(pattern="^(SAFE|SUSPICIOUS|DANGEROUS)$")] = None,
    kind: Annotated[str | None, Query(pattern="^(message|url|image)$")] = None,
) -> Page[AnalysisSummary]:
    """Return this account's analyses, newest first."""
    items, total = service.list_history(
        user_id=user.id, limit=limit, offset=offset, level=level, kind=kind
    )
    return Page.of(items, total=total, limit=limit, offset=offset)