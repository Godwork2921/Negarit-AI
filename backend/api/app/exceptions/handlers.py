"""Exception handlers that turn domain errors into the error envelope.

Two things are enforced here rather than being left to each endpoint:

- An unexpected exception is logged with its traceback but reported to the
  client as a generic message. A stack trace or database error can disclose the
  schema, the filesystem layout or a query, so it never leaves the process.
- Every error response carries the request id, so a user-reported failure can
  be matched to a log line without asking them for anything sensitive.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .errors import AppError

__all__ = ["register_exception_handlers", "error_payload"]

logger = logging.getLogger("negarit.api.errors")

#: Starlette's own codes mapped onto ours, so clients see one vocabulary.
_STATUS_CODE_MAP: dict[int, str] = {
    status.HTTP_400_BAD_REQUEST: "bad_request",
    status.HTTP_401_UNAUTHORIZED: "authentication_failed",
    status.HTTP_403_FORBIDDEN: "permission_denied",
    status.HTTP_404_NOT_FOUND: "not_found",
    status.HTTP_405_METHOD_NOT_ALLOWED: "method_not_allowed",
    status.HTTP_413_REQUEST_ENTITY_TOO_LARGE: "payload_too_large",
    status.HTTP_422_UNPROCESSABLE_ENTITY: "validation_failed",
    status.HTTP_429_TOO_MANY_REQUESTS: "rate_limited",
    status.HTTP_500_INTERNAL_SERVER_ERROR: "internal_error",
    status.HTTP_503_SERVICE_UNAVAILABLE: "upstream_unavailable",
}


def error_payload(
    code: str,
    message: str,
    request_id: str | None = None,
    details: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build the canonical error body."""
    error: dict[str, Any] = {"code": code, "message": message}
    if details:
        error["details"] = details
    if request_id:
        error["request_id"] = request_id
    return {"error": error}


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def _describe_validation(exc: RequestValidationError) -> dict[str, Any]:
    """Summarise pydantic errors without echoing the rejected input.

    ``exc.errors()`` includes the offending value for some error types, which
    would place a submitted password or message body in the response and the
    logs. Only the location and the type are reported.
    """
    fields: list[dict[str, str]] = []
    for error in exc.errors():
        location = ".".join(str(part) for part in error.get("loc", ()) if part != "body")
        fields.append(
            {
                "field": location or "body",
                "issue": error.get("type", "invalid"),
                "message": error.get("msg", "Invalid value"),
            }
        )
    return {"fields": fields}


def register_exception_handlers(app: FastAPI) -> None:
    """Attach every handler to ``app``."""

    @app.exception_handler(AppError)
    async def _app_error(request: Request, exc: AppError) -> JSONResponse:
        logger.warning(
            "domain_error code=%s path=%s", exc.code, request.url.path
        )
        headers: dict[str, str] = {}
        if exc.code == "rate_limited" and getattr(exc, "retry_after", None):
            headers["Retry-After"] = str(exc.retry_after)
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.to_payload(_request_id(request)),
            headers=headers or None,
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_payload(
                "validation_failed",
                "The request contains invalid data.",
                _request_id(request),
                _describe_validation(exc),
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        code = _STATUS_CODE_MAP.get(exc.status_code, "http_error")
        message = exc.detail if isinstance(exc.detail, str) else "Request failed."
        return JSONResponse(
            status_code=exc.status_code,
            content=error_payload(code, message, _request_id(request)),
        )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        # Full detail stays in the log; the client learns only that the request
        # failed and how to quote it.
        logger.exception(
            "unhandled_error path=%s method=%s", request.url.path, request.method
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_payload(
                "internal_error",
                "An unexpected error occurred. Please try again.",
                _request_id(request),
            ),
        )