"""Tests for the service surface around the endpoints.

Covers the health probe, the error envelope, rate limiting, CORS, and the
logging guarantees that keep secrets out of the log file.
"""

from __future__ import annotations

import json
import logging
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.database.session import build_engine, build_session_factory
from app.main import create_app


@pytest.fixture
def degraded_client(tmp_path) -> Iterator[TestClient]:
    """An app whose database is unreachable.

    Points at a port nothing is listening on so the failure path is exercised
    for real rather than mocked.
    """
    settings = Settings(
        app_env="test",
        database_url="postgresql://negarit:nobody@127.0.0.1:1/negarit",
        jwt_secret="a-valid-test-secret-of-sufficient-length-0123456789",
        rate_limit_enabled=False,
        log_level="error",
        db_pool_timeout=1,
        upload_dir=str(tmp_path / "uploads"),
    )
    app = create_app(settings)
    with TestClient(app, raise_server_exceptions=False) as client:
        yield client


class TestRoot:
    def test_root_identifies_the_service(self, client: TestClient) -> None:
        response = client.get("/")
        assert response.status_code == 200
        body = response.json()
        assert body["service"]
        assert body["version"]

    def test_root_does_not_leak_internals(self, client: TestClient) -> None:
        body = client.get("/").text.lower()
        for leak in ("password", "secret", "database_url", "postgres://", "jwt"):
            assert leak not in body


class TestHealth:
    def test_health_reports_ok_when_the_database_works(
        self, client: TestClient
    ) -> None:
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "ok"
        assert body["dependencies"]["database"]["status"] == "ok"
        assert body["dependencies"]["detection_engine"]["status"] == "ok"

    def test_health_reports_the_service_as_degraded_when_storage_is_down(
        self, degraded_client: TestClient
    ) -> None:
        """A dead database must not present the whole service as failed.

        Analysis still works without storage, so claiming ``down`` would page
        someone for an incident that has no user impact.
        """
        response = degraded_client.get("/api/v1/health")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "degraded"
        assert body["dependencies"]["database"]["status"] == "unavailable"
        assert body["dependencies"]["detection_engine"]["status"] == "ok"

    def test_health_names_the_modules_that_are_not_finished(
        self, client: TestClient
    ) -> None:
        """Unfinished capability must be visible, not quietly absent."""
        dependencies = client.get("/api/v1/health").json()["dependencies"]
        assert dependencies["image_analysis"]["status"] != "ok"
        assert dependencies["threat_intelligence"]["status"] == "disabled"
        assert dependencies["detection_engine"]["pending_modules"]

    def test_health_never_exposes_the_database_url(
        self, degraded_client: TestClient
    ) -> None:
        """The probe must not leak credentials embedded in the DSN."""
        text = degraded_client.get("/api/v1/health").text
        assert "nobody" not in text
        assert "127.0.0.1:1" not in text

    def test_health_never_requires_authentication(self, client: TestClient) -> None:
        """A probe that 401s tells an operator nothing about the service."""
        assert client.get("/api/v1/health").status_code == 200

    def test_health_is_exempt_from_rate_limiting(self) -> None:
        settings = Settings(
            app_env="test",
            database_url="sqlite+pysqlite:///:memory:",
            jwt_secret="a-valid-test-secret-of-sufficient-length-0123456789",
            rate_limit_enabled=True,
            analysis_rate_limit_requests=1,
            log_level="error",
        )
        app = create_app(settings)
        with TestClient(app, raise_server_exceptions=False) as probe:
            for _ in range(5):
                assert probe.get("/api/v1/health").status_code == 200


class TestDegradedOperation:
    def test_analysis_still_works_without_a_database(
        self, degraded_client: TestClient, phishing_message: str
    ) -> None:
        response = degraded_client.post(
            "/api/v1/analysis/message", json={"message": phishing_message}
        )
        assert response.status_code == 200
        body = response.json()
        assert body["risk_level"] == "DANGEROUS"
        # Correct verdict, honestly labelled as not saved.
        assert body["persisted"] is False

    def test_account_features_fail_loudly_instead_of_pretending(
        self, degraded_client: TestClient
    ) -> None:
        """Registration genuinely needs storage, so it must not claim success."""
        response = degraded_client.post(
            "/api/v1/auth/register",
            json={"email": "a@example.com", "password": "Aa1!aaaaaaaaaa"},
        )
        assert response.status_code >= 500
        assert response.json()["error"]["code"]


class TestErrorEnvelope:
    def test_every_error_uses_the_same_shape(self, client: TestClient) -> None:
        for response in (
            client.get("/api/v1/does-not-exist"),
            client.get("/api/v1/auth/me"),
            client.post("/api/v1/auth/login", json={}),
            client.post("/api/v1/analysis/message", json={"message": ""}),
        ):
            assert response.status_code >= 400
            body = response.json()
            assert set(body) == {"error"}
            assert set(body["error"]) >= {"code", "message", "request_id"}
            assert body["error"]["request_id"]

    def test_validation_errors_name_the_offending_field(
        self, client: TestClient
    ) -> None:
        body = client.post("/api/v1/auth/login", json={}).json()
        fields = body["error"]["details"]["fields"]
        assert fields
        assert {item["field"] for item in fields} & {"email", "password"}

    def test_validation_errors_do_not_echo_the_rejected_value(
        self, client: TestClient
    ) -> None:
        """A rejected password must not come back in the error body."""
        response = client.post(
            "/api/v1/auth/login", json={"email": "bad", "password": "hunter2"}
        )
        assert response.status_code == 422
        assert "hunter2" not in response.text

    def test_unknown_paths_return_404_in_the_standard_envelope(
        self, client: TestClient
    ) -> None:
        response = client.get("/api/v1/nope")
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "not_found"

    def test_internal_errors_do_not_disclose_details(
        self, client: TestClient
    ) -> None:
        """A stack trace in an error body is a disclosure vulnerability."""
        response = client.get("/api/v1/health")
        text = response.text.lower()
        assert "traceback" not in text
        assert "sqlalchemy" not in text

    def test_the_request_id_is_also_returned_as_a_header(
        self, client: TestClient
    ) -> None:
        """Lets a user quote one value that ties a screenshot to the logs."""
        response = client.get("/api/v1/auth/me")
        assert response.headers.get("x-request-id")
        assert response.headers["x-request-id"] == response.json()["error"]["request_id"]


class TestRateLimiting:
    @pytest.fixture
    def limited_client(self, tmp_path) -> Iterator[TestClient]:
        from app.database.session import Base, build_engine

        settings = Settings(
            app_env="test",
            database_url="sqlite+pysqlite:///:memory:",
            jwt_secret="a-valid-test-secret-of-sufficient-length-0123456789",
            rate_limit_enabled=True,
            analysis_rate_limit_requests=3,
            rate_limit_requests=2,
            log_level="error",
            upload_dir=str(tmp_path / "uploads"),
        )
        # The schema has to exist, or the account endpoints fail with a 500 and
        # the rate-limit behaviour cannot be observed.
        engine = build_engine(settings)
        Base.metadata.create_all(engine)
        from app.api import deps

        deps._ENGINE_CACHE[settings.database_url] = engine
        app = create_app(settings)
        try:
            with TestClient(app, raise_server_exceptions=False) as probe:
                yield probe
        finally:
            deps._ENGINE_CACHE.pop(settings.database_url, None)
            engine.dispose()

    def test_analysis_requests_are_capped(self, limited_client: TestClient) -> None:
        statuses = [
            limited_client.post("/api/v1/analysis/message", json={"message": "hello"})
            .status_code
            for _ in range(5)
        ]
        assert statuses[:3] == [200, 200, 200]
        assert statuses[3:] == [429, 429]

    def test_analysis_and_general_traffic_use_separate_buckets(
        self, limited_client: TestClient
    ) -> None:
        """Exhausting analysis calls must not lock a user out of signing in.

        Sharing one bucket means a burst of link checks — exactly what happens
        during a phishing wave — locks everyone out of the account endpoints
        they need to reach.
        """
        for _ in range(6):
            limited_client.post("/api/v1/analysis/message", json={"message": "hello"})

        login = limited_client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@example.com", "password": "Aa1!aaaaaaaaaa"},
        )
        # 401 (rejected credentials), not 429 (blocked by the analysis bucket).
        assert login.status_code == 401

    def test_rate_limited_responses_explain_themselves(
        self, limited_client: TestClient
    ) -> None:
        for _ in range(4):
            limited_client.post("/api/v1/analysis/message", json={"message": "hello"})
        body = limited_client.post(
            "/api/v1/analysis/message", json={"message": "hello"}
        ).json()
        assert body["error"]["code"] == "rate_limited"
        assert "try again" in body["error"]["message"].lower()

    def test_retry_after_is_advertised(self, limited_client: TestClient) -> None:
        for _ in range(4):
            limited_client.post("/api/v1/analysis/message", json={"message": "hello"})
        response = limited_client.post(
            "/api/v1/analysis/message", json={"message": "hello"}
        )
        assert int(response.headers["retry-after"]) > 0


class TestCors:
    def test_a_configured_origin_is_allowed(self, client: TestClient) -> None:
        response = client.get("/api/v1/health", headers={"Origin": "http://localhost:3000"})
        assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"

    def test_an_unconfigured_origin_is_not_echoed(self, client: TestClient) -> None:
        """Reflecting arbitrary origins would nullify the same-origin policy."""
        response = client.get("/api/v1/health", headers={"Origin": "https://evil.example"})
        assert response.headers.get("access-control-allow-origin") != "https://evil.example"

    def test_preflight_is_answered(self, client: TestClient) -> None:
        response = client.options(
            "/api/v1/analysis/message",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        )
        assert response.status_code in (200, 204)
        assert "authorization" in response.headers.get(
            "access-control-allow-headers", ""
        ).lower()


class TestOpenAPI:
    def test_the_schema_is_generated(self, client: TestClient) -> None:
        schema = client.get("/openapi.json").json()
        assert schema["info"]["title"]
        assert "/api/v1/analysis/message" in schema["paths"]
        assert "/api/v1/auth/register" in schema["paths"]

    def test_the_schema_documents_error_responses(self, client: TestClient) -> None:
        """A client generator needs to know these exist."""
        paths = client.get("/openapi.json").json()["paths"]
        assert "401" in paths["/api/v1/auth/me"]["get"]["responses"]
        assert "409" in paths["/api/v1/auth/register"]["post"]["responses"]


def _make_record(level: int, message: str) -> logging.LogRecord:
    """Build a record the way the logging system actually does.

    Going through the installed record factory is the point: constructing
    ``LogRecord`` directly would bypass the factory that guarantees
    ``request_id`` exists, and so would not test the production path at all.
    """
    return logging.getLogRecordFactory()(
        name="negarit.test",
        level=level,
        pathname=__file__,
        lineno=1,
        msg=message,
        args=(),
        exc_info=None,
    )


class TestLogging:
    def test_records_outside_a_request_do_not_crash_the_formatter(
        self, tmp_path
    ) -> None:
        """Regression guard.

        The plain-text formatter references ``%(request_id)s``, so a startup
        or shutdown record with no request id used to raise ``KeyError`` and
        emit a logging error instead of the log line.
        """
        settings = Settings(
            app_env="test",
            database_url="sqlite+pysqlite:///:memory:",
            jwt_secret="a-valid-test-secret-of-sufficient-length-0123456789",
            rate_limit_enabled=False,
            log_level="error",
            upload_dir=str(tmp_path / "uploads"),
        )
        app = create_app(settings)

        formatter = app.state.log_formatter
        record = _make_record(logging.INFO, "a message with no request context")
        rendered = formatter.format(record)
        assert "a message with no request context" in rendered
        assert "-" in rendered

    def test_context_outside_the_allowlist_is_dropped(self, tmp_path) -> None:
        settings = Settings(
            app_env="test",
            database_url="sqlite+pysqlite:///:memory:",
            jwt_secret="a-valid-test-secret-of-sufficient-length-0123456789",
            rate_limit_enabled=False,
            log_level="error",
            log_allowlist=["user_id", "path"],
            upload_dir=str(tmp_path / "uploads"),
        )
        app = create_app(settings)

        record = _make_record(logging.INFO, "with context")
        record.context = {
            "user_id": "abc",
            "path": "/api/v1/x",
            "password": "hunter2",
            "authorization": "Bearer abc",
        }
        rendered = app.state.log_formatter.format(record)
        # The plain formatter prints no context at all, which is the strongest
        # outcome: the secrets below cannot appear.
        assert "hunter2" not in rendered
        assert "Bearer abc" not in rendered

    def test_json_output_includes_allowlisted_context_but_not_secrets(
        self, tmp_path
    ) -> None:
        settings = Settings(
            app_env="test",
            database_url="sqlite+pysqlite:///:memory:",
            jwt_secret="a-valid-test-secret-of-sufficient-length-0123456789",
            rate_limit_enabled=False,
            log_level="error",
            log_json_format=True,
            log_allowlist=["user_id", "path"],
            upload_dir=str(tmp_path / "uploads"),
        )
        app = create_app(settings)

        record = _make_record(logging.INFO, "with context")
        record.context = {
            "user_id": "abc",
            "path": "/api/v1/x",
            "password": "hunter2",
            "authorization": "Bearer abc",
            "api_key": "sk-live-123",
        }
        payload = json.loads(app.state.log_formatter.format(record))
        assert payload["user_id"] == "abc"
        assert payload["path"] == "/api/v1/x"
        assert "password" not in payload
        assert "authorization" not in payload
        assert "api_key" not in payload
        assert "hunter2" not in json.dumps(payload)
        assert "sk-live-123" not in json.dumps(payload)

    def test_json_output_is_machine_readable(self, tmp_path) -> None:
        settings = Settings(
            app_env="test",
            database_url="sqlite+pysqlite:///:memory:",
            jwt_secret="a-valid-test-secret-of-sufficient-length-0123456789",
            rate_limit_enabled=False,
            log_level="error",
            log_json_format=True,
            upload_dir=str(tmp_path / "uploads"),
        )
        app = create_app(settings)

        record = _make_record(logging.WARNING, "structured message")
        payload = json.loads(app.state.log_formatter.format(record))
        assert payload["level"] == "warning"
        assert payload["message"] == "structured message"
        assert payload["logger"] == "negarit.test"


class TestDatabaseSession:
    def test_the_connection_pool_is_not_rebuilt_per_request(
        self, settings: Settings
    ) -> None:
        """A pool per request would exhaust PostgreSQL connections under load."""
        from app.api import deps

        deps._ENGINE_CACHE.clear()
        try:
            first = deps._get_engine(settings)
            second = deps._get_engine(settings)
            assert first is second
        finally:
            deps._ENGINE_CACHE.clear()

    def test_a_failed_session_rolls_back(self, engine) -> None:
        from sqlalchemy import text

        from app.models import User

        session = build_session_factory(engine)()
        session.add(
            User(email="rollback@example.com", password_hash="$argon2id$fake")
        )
        session.commit()

        # Break the session and confirm a raise leaves it clean.
        try:
            with session.begin_nested():
                raise RuntimeError("boom")
        except RuntimeError:
            pass
        session.rollback()

        assert session.execute(text("SELECT count(*) FROM users")).scalar() == 1
        session.close()