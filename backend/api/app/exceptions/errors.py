"""Domain exceptions and the error envelope they are rendered into.

The API never leaks an internal traceback or a database message to a client.
Every failure that crosses the service boundary becomes an
:class:`AppError` carrying a stable machine-readable ``code``, a safe
human-readable ``message``, and an HTTP status. Handlers turn those into a
single consistent JSON shape so the frontend can branch on ``code`` instead of
parsing prose.
"""

from __future__ import annotations

from typing import Any

__all__ = [
    "AppError",
    "ValidationFailed",
    "AuthenticationFailed",
    "PermissionDenied",
    "NotFound",
    "Conflict",
    "RateLimited",
    "UpstreamUnavailable",
    "AnalysisFailed",
    "ERROR_CATALOG",
]


class AppError(Exception):
    """Base class for every error the service raises deliberately.

    Attributes:
        code: Stable identifier for clients to branch on. Never localised and
            never reworded, because the frontend depends on it.
        message: Human-readable text that is safe to display. It must never
            contain secrets, SQL, file paths or stack frames.
        status_code: HTTP status to return.
        details: Optional structured context, e.g. per-field validation errors.
    """

    code: str = "internal_error"
    status_code: int = 500
    message: str = "An unexpected error occurred."

    def __init__(
        self,
        message: str | None = None,
        *,
        code: str | None = None,
        status_code: int | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.message = message or type(self).message
        self.code = code or type(self).code
        self.status_code = status_code or type(self).status_code
        self.details = details or {}
        super().__init__(self.message)

    def to_payload(self, request_id: str | None = None) -> dict[str, Any]:
        """Render the error into the wire format."""
        payload: dict[str, Any] = {
            "error": {
                "code": self.code,
                "message": self.message,
            }
        }
        if self.details:
            payload["error"]["details"] = self.details
        if request_id:
            payload["error"]["request_id"] = request_id
        return payload


class ValidationFailed(AppError):
    """The request was understood but its contents are unacceptable."""

    code = "validation_failed"
    status_code = 422
    message = "The request contains invalid data."


class AuthenticationFailed(AppError):
    """No valid credentials were presented."""

    code = "authentication_failed"
    status_code = 401
    message = "Authentication is required to access this resource."


class PermissionDenied(AppError):
    """Credentials were valid but insufficient for this action."""

    code = "permission_denied"
    status_code = 403
    message = "You do not have permission to perform this action."


class NotFound(AppError):
    """The requested resource does not exist."""

    code = "not_found"
    status_code = 404
    message = "The requested resource was not found."


class Conflict(AppError):
    """The request conflicts with the current state of the resource."""

    code = "conflict"
    status_code = 409
    message = "The request conflicts with the current state."


class RateLimited(AppError):
    """The caller has exceeded their quota."""

    code = "rate_limited"
    status_code = 429
    message = "Too many requests. Please slow down."

    def __init__(
        self,
        message: str | None = None,
        *,
        retry_after: int = 60,
        **kwargs: Any,
    ) -> None:
        details = dict(kwargs.pop("details", None) or {})
        details["retry_after_seconds"] = retry_after
        super().__init__(message, details=details, **kwargs)
        self.retry_after = retry_after


class UpstreamUnavailable(AppError):
    """A dependency the request needed was unavailable.

    Used when, for example, the database or a threat-intelligence provider
    cannot be reached. The distinction matters: this is a transient condition
    and the caller may retry, unlike a bad request.
    """

    code = "upstream_unavailable"
    status_code = 503
    message = "A required service is temporarily unavailable."


class AnalysisFailed(AppError):
    """Analysis could not be completed.

    The detection engine is designed so that a partial failure still yields a
    usable result. Reaching this error means the request could not be analysed
    at all, and the client is told so instead of receiving an empty verdict
    that looks like a clean bill of health.
    """

    code = "analysis_failed"
    status_code = 422
    message = "The content could not be analysed."


#: Documented catalogue of error codes, exposed by the API so the frontend and
#: any integration tests can assert against a single source of truth.
ERROR_CATALOG: dict[str, dict[str, str]] = {
    error.code: {"message": error.message, "status": str(error.status_code)}
    for error in (
        ValidationFailed,
        AuthenticationFailed,
        PermissionDenied,
        NotFound,
        Conflict,
        RateLimited,
        UpstreamUnavailable,
        AnalysisFailed,
        AppError,
    )
}