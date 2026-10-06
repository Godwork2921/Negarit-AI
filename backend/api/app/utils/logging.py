"""Structured logging setup.

Two properties matter for operating this service:

- **Allow-listed context.** ``log_context`` only emits keys named in
  ``Settings.log_allowlist``. Without that, any code that passed a request
  body or a token into the logging context would write a secret to disk.
- **Correlation.** Every request carries a ``request_id`` that appears in each
  log line and in every error response, so a user-reported failure maps to
  exactly one set of log lines.

Logs never contain message bodies, passwords, tokens or raw URLs with query
strings. Analysis inputs are not logged; only their identifiers and timings.
"""

from __future__ import annotations

import json
import logging
import sys
from contextvars import ContextVar
from typing import Any

__all__ = [
    "configure_logging",
    "get_logger",
    "request_id_var",
    "install_record_factory",
    "JsonFormatter",
    "PlainFormatter",
]

request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)

#: Keys that must never be logged, whatever the allow-list says. Applied as a
#: belt-and-braces second pass so a future edit cannot leak one by accident.
_FORBIDDEN_FRAGMENTS = (
    "password",
    "secret",
    "token",
    "authorization",
    "cookie",
    "api_key",
    "apikey",
    "credential",
)


def _sanitise_context(record: logging.LogRecord, allowlist: frozenset[str]) -> None:
    """Strip context keys that are not explicitly permitted, in place.

    Applied inside the formatter rather than only as a handler filter: a filter
    attached to one handler protects only that handler, so a second handler or a
    direct ``format()`` call would emit the same record unfiltered. Enforcing it
    at the point of serialisation means the guarantee holds wherever the output
    goes.
    """
    context = getattr(record, "context", None)
    if not isinstance(context, dict):
        return
    record.context = {
        key: value
        for key, value in context.items()
        if key in allowlist
        and not any(fragment in key.lower() for fragment in _FORBIDDEN_FRAGMENTS)
    }


class JsonFormatter(logging.Formatter):
    """Render records as newline-delimited JSON for log aggregation."""

    def __init__(self, allowlist: frozenset[str] = frozenset()) -> None:
        super().__init__()
        self._allowlist = allowlist

    def format(self, record: logging.LogRecord) -> str:
        _sanitise_context(record, self._allowlist)

        payload: dict[str, Any] = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname.lower(),
            "logger": record.name,
            "message": record.getMessage(),
        }
        request_id = getattr(record, "request_id", None) or request_id_var.get()
        if request_id and request_id != "-":
            payload["request_id"] = request_id

        context = getattr(record, "context", None)
        if isinstance(context, dict):
            payload.update({k: v for k, v in context.items() if v is not None})

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str, ensure_ascii=False)


class PlainFormatter(logging.Formatter):
    """Human-readable output for local development."""

    #: ``request_id`` is always present on records because
    #: :func:`install_record_factory` guarantees it.
    TEMPLATE = "%(asctime)s %(levelname)-8s %(name)s [%(request_id)s] %(message)s"

    def __init__(self, allowlist: frozenset[str] = frozenset()) -> None:
        super().__init__(self.TEMPLATE, datefmt="%H:%M:%S")
        self._allowlist = allowlist

    def format(self, record: logging.LogRecord) -> str:
        _sanitise_context(record, self._allowlist)
        return super().format(record)


class ContextFilter(logging.Filter):
    """Attach the current request id to each record.

    The attribute is always set, falling back to ``-``. The plain-text
    formatter references ``%(request_id)s`` unconditionally, so a record
    emitted outside a request (startup, shutdown, a background task) would
    otherwise raise ``KeyError`` and be replaced by a logging error on stderr.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "request_id"):
            record.request_id = request_id_var.get() or "-"  # type: ignore[attr-defined]
        return True


class AllowListFilter(logging.Filter):
    """Drop context keys that are not explicitly permitted.

    Kept for defence in depth alongside the formatters, which already enforce
    the same rule.
    """

    def __init__(self, allowlist: frozenset[str]) -> None:
        super().__init__()
        self._allowlist = allowlist

    def filter(self, record: logging.LogRecord) -> bool:
        _sanitise_context(record, self._allowlist)
        return True


def install_record_factory() -> None:
    """Guarantee every log record carries a ``request_id``.

    Done at the factory rather than in :class:`ContextFilter` because a handler
    filter only runs for the handler it is attached to. Any second handler, or a
    direct call to ``formatter.format(record)``, would otherwise hit
    ``ValueError: Formatting field not found in record: 'request_id'`` and
    silently lose the log line.
    """
    previous = logging.getLogRecordFactory()

    def factory(*args: Any, **kwargs: Any) -> logging.LogRecord:
        record = previous(*args, **kwargs)
        if not hasattr(record, "request_id"):
            record.request_id = request_id_var.get() or "-"  # type: ignore[attr-defined]
        return record

    logging.setLogRecordFactory(factory)


def configure_logging(level: str = "info", json_format: bool = False,
                      allowlist: list[str] | None = None) -> logging.Formatter:
    """Install the root handler. Called once during application startup.

    Returns the configured formatter so callers (and tests) can render a record
    directly instead of trying to guess how output will be formatted.
    """
    permitted = frozenset(allowlist or [])

    handler = logging.StreamHandler(sys.stdout)
    if json_format:
        formatter: logging.Formatter = JsonFormatter(permitted)
    else:
        formatter = PlainFormatter(permitted)
    handler.setFormatter(formatter)

    handler.addFilter(ContextFilter())
    handler.addFilter(AllowListFilter(permitted))
    install_record_factory()

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level.upper())

    # uvicorn installs its own handlers; route them through ours so JSON output
    # is not interleaved with plain-text lines.
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logger = logging.getLogger(name)
        logger.handlers.clear()
        logger.propagate = True

    # Access logs would record full URLs including query strings, which may
    # carry tokens. Request paths are logged by the middleware instead.
    logging.getLogger("uvicorn.access").disabled = True

    return formatter


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)