"""Shared test fixtures.

Tests run against SQLite in memory, so the suite needs no PostgreSQL and no
network. The application is built with explicit ``Settings`` rather than the
ambient environment, which keeps the tests independent of any local ``.env``.
"""

from __future__ import annotations

import sys
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.config import Settings  # noqa: E402
from app.database.session import Base, build_engine, build_session_factory  # noqa: E402
from app.main import create_app  # noqa: E402

# Importing the models registers their tables on ``Base.metadata``. Without it
# ``create_all`` silently builds an empty schema and every query fails with
# "no such table".
from app import models as _models  # noqa: E402,F401

#: Cheap hashing parameters. Production uses the OWASP minimum; hashing at full
#: cost would add minutes to the suite without testing anything extra.
TEST_HASH_PARAMS = {
    "password_hash_iterations": 1,
    "password_hash_memory_kib": 8192,
    "password_hash_parallelism": 1,
}

TEST_JWT_SECRET = "test-secret-not-used-anywhere-else-0123456789"


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        app_env="test",
        database_url="sqlite+pysqlite:///:memory:",
        jwt_secret=TEST_JWT_SECRET,
        rate_limit_enabled=False,
        log_level="warning",
        upload_dir=str(tmp_path / "uploads"),
        **TEST_HASH_PARAMS,
    )


@pytest.fixture
def engine(settings: Settings):
    """A fresh in-memory database with the schema created.

    The factory pins the pool to a single connection because every connection to
    a ``:memory:`` SQLite database gets its own private, empty copy of it.
    """
    engine = build_engine(settings)
    Base.metadata.create_all(engine)
    assert Base.metadata.tables, "no tables were registered on the metadata"
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture
def session_factory(engine):
    return build_session_factory(engine)


@pytest.fixture
def session(session_factory) -> Iterator:
    db = session_factory()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(settings: Settings, engine) -> Iterator[TestClient]:
    """A TestClient wired to the in-memory database."""
    from app.api import deps

    # Point the application's engine cache at the test engine. The key is the
    # database URL, which is identical to what the app would build for itself.
    deps._ENGINE_CACHE[settings.database_url] = engine

    application = create_app(settings)
    with TestClient(application, raise_server_exceptions=False) as test_client:
        yield test_client
    deps._ENGINE_CACHE.pop(settings.database_url, None)


# ── Fixtures for concrete inputs ───────────────────────────────────────

@pytest.fixture
def phishing_message() -> str:
    return (
        "URGENT: Your account will be suspended in 2 hours. "
        "Verify your identity immediately: "
        "https://secure-login.paypal.com.evil.tk/auth"
    )


@pytest.fixture
def benign_message() -> str:
    return "Your meeting is scheduled for tomorrow at 10:00 AM."


@pytest.fixture
def malicious_url() -> str:
    return "http://paypa1-security-example.com"


@pytest.fixture
def benign_url() -> str:
    return "https://www.microsoft.com/en-gb"


@pytest.fixture
def registered_user(client: TestClient) -> dict[str, str]:
    """Register an account and return its credentials plus tokens."""
    payload = {
        "email": "analyst@example.com",
        "password": "correct horse battery staple",
        "full_name": "Test Analyst",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    body = response.json()
    return {
        "email": payload["email"],
        "password": payload["password"],
        "user_id": body["user"]["id"],
        "access_token": body["tokens"]["access_token"],
        "refresh_token": body["tokens"]["refresh_token"],
    }


@pytest.fixture
def auth_headers(registered_user: dict[str, str]) -> dict[str, str]:
    return {"Authorization": f"Bearer {registered_user['access_token']}"}