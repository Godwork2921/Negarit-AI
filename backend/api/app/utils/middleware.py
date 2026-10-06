"""Request context and rate limiting middleware."""

from __future__ import annotations

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.exceptions.handlers import error_payload
from app.utils.logging import request_id_var

__all__ = ["RequestContextMiddleware", "InMemoryRateLimiter"]

logger = logging.getLogger("negarit.api.request")

#: Paths that stay reachable when a deployment is degraded, so a monitor can
#: still observe the service while authentication is failing.
_ALWAYS_ALLOWED = ("/api/v1/health", "/health", "/docs", "/openapi.json", "/redoc")


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Assign a request id, time the request, and log the outcome.

    The id is echoed in the ``X-Request-ID`` response header and returned to
    the client in any error body, so a failure reported by a user can be traced
    without them having to describe what they submitted.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        request.state.request_id = request_id
        token = request_id_var.set(request_id)
        started = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            logger.exception(
                "request_failed",
                extra={
                    "context": {
                        "method": request.method,
                        "path": request.url.path,
                        "duration_ms": round((time.perf_counter() - started) * 1000, 2),
                        "client_ip": client_ip(request),
                    }
                },
            )
            raise
        finally:
            request_id_var.reset(token)

        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "request_complete",
            extra={
                "context": {
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                    "client_ip": client_ip(request),
                    "user_agent": request.headers.get("user-agent"),
                }
            },
        )
        return response


def client_ip(request: Request) -> str | None:
    """Best-effort client address.

    ``X-Forwarded-For`` is only consulted when the service is behind a proxy it
    controls; trusting it unconditionally would let any caller forge their own
    address and defeat per-client rate limiting.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded and request.app.state.trust_forwarded_for:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


class InMemoryRateLimiter(BaseHTTPMiddleware):
    """Fixed-window per-client rate limiting.

    In-process and therefore per-instance: adequate for a single-process
    deployment, and deliberately simple. A multi-worker or multi-host rollout
    needs a shared store (Redis) or the limit silently multiplies by the worker
    count. That limitation is stated rather than hidden, because a rate limit
    that appears to work but does not is worse than none at all.
    """

    def __init__(
        self,
        app,
        *,
        enabled: bool,
        general_limit: int,
        general_window: int,
        analysis_limit: int,
        analysis_window: int,
    ) -> None:
        super().__init__(app)
        self.enabled = enabled
        self.general_limit = general_limit
        self.general_window = general_window
        self.analysis_limit = analysis_limit
        self.analysis_window = analysis_window
        self._buckets: dict[tuple[str, str], list[float]] = {}

    def _bucket_for(self, kind: str, identity: str, window: int) -> tuple[bool, int]:
        """Record a hit and report whether the caller is over quota."""
        now = time.monotonic()
        key = (kind, identity)
        hits = [t for t in self._buckets.get(key, []) if now - t < window]
        hits.append(now)
        self._buckets[key] = hits
        limit = self.analysis_limit if kind == "analysis" else self.general_limit
        allowed = len(hits) <= limit
        retry_after = max(1, int(window - (now - min(hits)))) if not allowed else 0
        return allowed, retry_after

    def _prune(self) -> None:
        """Drop stale buckets so the map cannot grow without bound."""
        now = time.monotonic()
        longest = max(self.general_window, self.analysis_window)
        for key, hits in list(self._buckets.items()):
            fresh = [t for t in hits if now - t < longest]
            if fresh:
                self._buckets[key] = fresh
            else:
                del self._buckets[key]

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        if not self.enabled or request.url.path in _ALWAYS_ALLOWED:
            return await call_next(request)

        kind = "analysis" if "/analysis" in request.url.path else "general"
        window = self.analysis_window if kind == "analysis" else self.general_window
        identity = client_ip(request) or "unknown"

        if len(self._buckets) > 10_000:
            self._prune()

        allowed, retry_after = self._bucket_for(kind, identity, window)
        if not allowed:
            logger.warning(
                "rate_limited",
                extra={"context": {"client_ip": identity, "path": request.url.path}},
            )
            return JSONResponse(
                status_code=429,
                content=error_payload(
                    "rate_limited",
                    "Too many requests. Please slow down and try again shortly.",
                    getattr(request.state, "request_id", None),
                    {"retry_after_seconds": retry_after},
                ),
                headers={"Retry-After": str(retry_after)},
            )
        return await call_next(request)