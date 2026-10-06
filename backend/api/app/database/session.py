"""Declarative base and engine/session construction.

The service is built so that a missing database degrades the product rather
than breaking it: analysis runs without persistence, and only the features
that genuinely need storage (accounts, history) report an error. That keeps a
demo or a stateless analysis worker useful when PostgreSQL is unavailable.
"""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import Settings

__all__ = ["Base", "build_engine", "build_session_factory", "check_database"]

logger = logging.getLogger("negarit.api.database")


class Base(DeclarativeBase):
    """Declarative base for every ORM model."""


def _is_in_memory(url: str) -> bool:
    """True for SQLite URLs that live only inside the process.

    ``:memory:`` and the equivalent ``mode=memory`` cache both create a
    database per connection unless the pool is pinned.
    """
    if url.startswith("sqlite"):
        return ":memory:" in url or "mode=memory" in url
    return False


def build_engine(settings: Settings) -> Engine:
    """Create the SQLAlchemy engine described by ``settings``."""
    url = settings.database_url
    kwargs: dict[str, Any] = {"echo": settings.db_echo, "future": True}

    if url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
        if _is_in_memory(url):
            # Each ordinary connection to ``:memory:`` creates its own private,
            # empty database, so a schema created on one connection is
            # invisible on the next. Pinning the pool to a single connection
            # makes the URL behave like the database it looks like, rather than
            # a source of "no such table" errors.
            kwargs["poolclass"] = StaticPool
    else:
        kwargs.update(
            pool_size=settings.db_pool_size,
            max_overflow=settings.db_max_overflow,
            pool_timeout=settings.db_pool_timeout,
            pool_recycle=settings.db_pool_recycle,
            pool_pre_ping=True,
        )

    return create_engine(url, **kwargs)


def build_session_factory(engine: Engine) -> sessionmaker:
    """Create the session factory bound to ``engine``."""
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


async def check_database(settings: Settings) -> dict[str, Any]:
    """Probe the database and report its state without raising.

    Returns one of:

    * ``ok`` — a trivial query succeeded.
    * ``unavailable`` — the database could not be reached. Analysis still runs;
      only persistence is affected.
    * ``not_configured`` — no database URL was supplied.
    """
    url = settings.database_url
    if not url:
        return {"status": "not_configured", "detail": "DATABASE_URL is empty"}

    try:
        engine = build_engine(settings)
    except Exception as exc:
        return {"status": "unavailable", "detail": f"invalid database configuration: {exc}"}

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        # Dispose so a probe does not leave a pooled connection behind.
        engine.dispose()
        return {"status": "ok", "dialect": engine.dialect.name}
    except Exception as exc:
        engine.dispose()
        logger.warning("database_unavailable detail=%s", exc)
        return {
            "status": "unavailable",
            "detail": "the database could not be reached; analysis is unaffected "
            "but accounts and history are disabled",
        }