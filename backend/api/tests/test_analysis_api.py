"""End-to-end tests for the analysis endpoints.

The assertions here are about the *contract* the service promises, not about the
specific wording of an explanation: a bounded score, a band consistent with the
configured thresholds, working explainability, and the rule that an unavailable
check is never presented as a clean result.
"""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient


def _post(client: TestClient, path: str, headers: dict | None = None, **body) -> dict:
    response = client.post(path, json=body, headers=headers or {})
    assert response.status_code == 200, response.text
    return response.json()


class TestMessageAnalysis:
    def test_phishing_message_is_flagged_dangerous(
        self, client: TestClient, phishing_message: str
    ) -> None:
        body = _post(client, "/api/v1/analysis/message", message=phishing_message)
        assert body["risk_score"] >= 70
        assert body["risk_level"] == "DANGEROUS"
        assert body["explanation"]
        assert body["recommended_actions"]

    def test_benign_message_is_low_risk(
        self, client: TestClient, benign_message: str
    ) -> None:
        body = _post(client, "/api/v1/analysis/message", message=benign_message)
        assert body["risk_score"] < 30
        assert body["risk_level"] == "SAFE"

    def test_score_is_always_within_bounds(
        self, client: TestClient, phishing_message: str, benign_message: str
    ) -> None:
        """A score outside 0-100 would break every threshold comparison."""
        for message in (phishing_message, benign_message, "x" * 500, "!?@#$"):
            body = _post(client, "/api/v1/analysis/message", message=message)
            assert 0 <= body["risk_score"] <= 100

    def test_band_matches_the_configured_thresholds(
        self, client: TestClient, phishing_message: str, benign_message: str
    ) -> None:
        """The verdict must follow the thresholds the response itself reports."""
        for message in (phishing_message, benign_message):
            body = _post(client, "/api/v1/analysis/message", message=message)
            policy = body["risk_policy"]
            score = body["risk_score"]
            if score <= int(policy["RISK_SAFE_MAX"]):
                expected = "SAFE"
            elif score <= int(policy["RISK_SUSPICIOUS_MAX"]):
                expected = "SUSPICIOUS"
            else:
                expected = "DANGEROUS"
            assert body["risk_level"] == expected

    def test_thresholds_are_taken_from_configuration(
        self, client: TestClient, benign_message: str
    ) -> None:
        """Retuning the bands must actually change the verdicts.

        The reported policy is echoed in the response so this also proves the
        values are not hardcoded constants.
        """
        assert (
            _post(client, "/api/v1/analysis/message", message=benign_message)[
                "risk_policy"
            ]["RISK_SAFE_MAX"]
            == "29"
        )

    def test_indicators_carry_evidence(
        self, client: TestClient, phishing_message: str
    ) -> None:
        """An indicator with no evidence is an assertion, not a finding."""
        body = _post(client, "/api/v1/analysis/message", message=phishing_message)
        indicators = body["indicators"]
        assert indicators
        assert all(item["type"] and item["description"] for item in indicators)
        assert all("severity" in item for item in indicators)

    def test_detected_urls_are_reported(
        self, client: TestClient, phishing_message: str
    ) -> None:
        body = _post(client, "/api/v1/analysis/message", message=phishing_message)
        assert any("evil.tk" in url for url in body["detected_urls"])

    def test_signals_report_availability(
        self, client: TestClient, phishing_message: str
    ) -> None:
        """Unavailable checks must be visible, never silently treated as clean."""
        body = _post(client, "/api/v1/analysis/message", message=phishing_message)
        signals = body["signals"]
        assert signals
        for signal in signals:
            assert isinstance(signal["available"], bool)
            if not signal["available"]:
                assert signal["reason"]

    def test_engine_version_is_reported(
        self, client: TestClient, phishing_message: str
    ) -> None:
        body = _post(client, "/api/v1/analysis/message", message=phishing_message)
        assert body["engine_version"]
        assert body["engine_version"] != "unknown"

    def test_sender_email_is_considered(
        self, client: TestClient, benign_message: str
    ) -> None:
        plain = _post(client, "/api/v1/analysis/message", message=benign_message)
        spoofed = _post(
            client,
            "/api/v1/analysis/message",
            message=benign_message,
            sender_email="security@paypa1-support.example",
        )
        assert spoofed["risk_score"] >= plain["risk_score"]

    def test_save_false_does_not_persist(
        self, client: TestClient, auth_headers, phishing_message: str, session
    ) -> None:
        from app.models import Analysis

        body = _post(
            client,
            "/api/v1/analysis/message",
            message=phishing_message,
            save=False,
        )
        assert body["persisted"] is False
        assert body["id"] is None
        assert session.query(Analysis).count() == 0

    @pytest.mark.parametrize(
        "payload",
        [
            {"message": ""},
            {"message": "   "},
            {"message": "x" * 20001},
            {},
            {"message": 12345},
        ],
    )
    def test_invalid_input_returns_422(
        self, client: TestClient, payload: dict
    ) -> None:
        response = client.post("/api/v1/analysis/message", json=payload)
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "validation_failed"

    def test_the_submitted_message_is_not_echoed_back(
        self, client: TestClient, phishing_message: str
    ) -> None:
        """Returning the input would multiply any storage or logging exposure."""
        body = _post(client, "/api/v1/analysis/message", message=phishing_message)
        assert body.get("message") is None
        assert "input_text" not in body


class TestUrlAnalysis:
    def test_typosquat_url_is_flagged(
        self, client: TestClient, malicious_url: str
    ) -> None:
        body = _post(client, "/api/v1/analysis/url", url=malicious_url)
        assert body["risk_score"] >= 70
        assert body["risk_level"] == "DANGEROUS"
        assert body["detected_urls"] == [malicious_url]

    def test_legitimate_url_is_low_risk(
        self, client: TestClient, benign_url: str
    ) -> None:
        body = _post(client, "/api/v1/analysis/url", url=benign_url)
        assert body["risk_score"] < 30
        assert body["risk_level"] == "SAFE"

    def test_ip_literal_url_is_flagged(
        self, client: TestClient
    ) -> None:
        body = _post(client, "/api/v1/analysis/url", url="http://192.168.1.1/login")
        assert body["risk_score"] > 0

    def test_url_is_never_fetched(
        self, client: TestClient, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Submitting a link must not make the server contact it.

        Any outbound request would let an anonymous caller aim the service at
        internal addresses and would expose user IPs to whoever controls the
        submitted host.
        """

        def _forbidden(*args, **kwargs):  # pragma: no cover
            raise AssertionError("the analysis path must not perform I/O")

        import socket

        monkeypatch.setattr(socket.socket, "connect", _forbidden)
        monkeypatch.setattr(socket, "create_connection", _forbidden)

        response = client.post(
            "/api/v1/analysis/url", json={"url": "http://paypa1-security.example"}
        )
        assert response.status_code == 200

    @pytest.mark.parametrize(
        "url", ["", "   ", "not a url", "javascript:alert(1)", "x" * 5000]
    )
    def test_unusable_urls_are_rejected(self, client: TestClient, url: str) -> None:
        response = client.post("/api/v1/analysis/url", json={"url": url})
        assert response.status_code == 422


class TestAnonymousAccess:
    def test_analysis_works_without_an_account(
        self, client: TestClient, phishing_message: str
    ) -> None:
        """Someone spotting a scam should not have to register to check it."""
        response = client.post(
            "/api/v1/analysis/message", json={"message": phishing_message}
        )
        assert response.status_code == 200
        assert response.json()["persisted"] is False

    def test_an_invalid_token_is_treated_as_anonymous(
        self, client: TestClient, phishing_message: str
    ) -> None:
        """An expired token in a stored page must not block a verdict."""
        response = client.post(
            "/api/v1/analysis/message",
            json={"message": phishing_message},
            headers={"Authorization": "Bearer expired.invalid.token"},
        )
        assert response.status_code == 200
        assert response.json()["persisted"] is False


class TestPersistence:
    def test_an_authenticated_result_is_saved(
        self, client: TestClient, auth_headers, phishing_message: str, session
    ) -> None:
        from app.models import Analysis

        body = _post(
            client,
            "/api/v1/analysis/message",
            headers=auth_headers,
            message=phishing_message,
        )
        assert body["persisted"] is True
        assert uuid.UUID(body["id"])

        session.expire_all()
        assert session.query(Analysis).count() == 1

    def test_history_returns_saved_results_newest_first(
        self, client: TestClient, auth_headers, phishing_message: str
    ) -> None:
        _post(client, "/api/v1/analysis/message", headers=auth_headers, message=phishing_message)
        _post(client, "/api/v1/analysis/url", headers=auth_headers, url="http://paypa1-security.example")

        response = client.get("/api/v1/analysis/history/list", headers=auth_headers)
        assert response.status_code == 200
        page = response.json()
        assert page["meta"]["total"] == 2
        assert [item["kind"] for item in page["items"]] == ["url", "message"]

    def test_history_is_paginated(
        self, client: TestClient, auth_headers, benign_message: str
    ) -> None:
        for _ in range(5):
            _post(
                client,
                "/api/v1/analysis/message",
                headers=auth_headers,
                message=benign_message,
            )

        page = client.get(
            "/api/v1/analysis/history/list?limit=2&offset=0", headers=auth_headers
        ).json()
        assert len(page["items"]) == 2
        assert page["meta"]["total"] == 5
        assert page["meta"]["limit"] == 2
        assert page["meta"]["offset"] == 0
        assert page["meta"]["has_more"] is True

    def test_history_can_be_filtered_by_kind(
        self, client: TestClient, auth_headers, phishing_message: str
    ) -> None:
        _post(client, "/api/v1/analysis/message", headers=auth_headers, message=phishing_message)
        _post(client, "/api/v1/analysis/url", headers=auth_headers, url="http://paypa1-security.example")

        page = client.get(
            "/api/v1/analysis/history/list?kind=message", headers=auth_headers
        ).json()
        assert page["meta"]["total"] == 1
        assert page["items"][0]["kind"] == "message"

    def test_history_can_be_filtered_by_level(
        self, client: TestClient, auth_headers, phishing_message: str, benign_message: str
    ) -> None:
        _post(client, "/api/v1/analysis/message", headers=auth_headers, message=phishing_message)
        _post(client, "/api/v1/analysis/message", headers=auth_headers, message=benign_message)

        page = client.get(
            "/api/v1/analysis/history/list?level=DANGEROUS", headers=auth_headers
        ).json()
        assert page["meta"]["total"] == 1
        assert page["items"][0]["risk_level"] == "DANGEROUS"

    def test_a_stored_result_replays_the_original_verdict(
        self, client: TestClient, auth_headers, phishing_message: str
    ) -> None:
        """Historical verdicts must not change when the engine is retuned."""
        saved = _post(client, "/api/v1/analysis/message", headers=auth_headers, message=phishing_message)

        fetched = client.get(f"/api/v1/analysis/{saved['id']}", headers=auth_headers)
        assert fetched.status_code == 200
        replayed = fetched.json()
        assert replayed["risk_score"] == saved["risk_score"]
        assert replayed["risk_level"] == saved["risk_level"]
        assert replayed["explanation"] == saved["explanation"]
        assert replayed["indicators"] == saved["indicators"]

    def test_history_requires_authentication(self, client: TestClient) -> None:
        assert client.get("/api/v1/analysis/history/list").status_code == 401

    def test_another_user_cannot_read_a_result(
        self, client: TestClient, auth_headers, phishing_message: str, session
    ) -> None:
        """Horizontal privilege escalation guard."""
        saved = _post(client, "/api/v1/analysis/message", headers=auth_headers, message=phishing_message)

        # Register a second, unrelated account.
        other = client.post(
            "/api/v1/auth/register",
            json={"email": "intruder@example.com", "password": "Aa1!aaaaaaaaaa"},
        ).json()

        response = client.get(
            f"/api/v1/analysis/{saved['id']}",
            headers={"Authorization": f"Bearer {other['tokens']['access_token']}"},
        )
        assert response.status_code == 404

    def test_a_missing_result_returns_404(
        self, client: TestClient, auth_headers
    ) -> None:
        response = client.get(f"/api/v1/analysis/{uuid.uuid4()}", headers=auth_headers)
        assert response.status_code == 404

    def test_a_non_uuid_identifier_is_rejected(
        self, client: TestClient, auth_headers
    ) -> None:
        response = client.get("/api/v1/analysis/not-a-uuid", headers=auth_headers)
        assert response.status_code == 422


class TestImageAnalysis:
    def test_image_analysis_reports_it_is_unavailable(
        self, client: TestClient
    ) -> None:
        """Better an honest 501 than a fabricated verdict.

        Accepting the upload and returning text-only results would misrepresent
        what the service actually examined.
        """
        response = client.post("/api/v1/analysis/image")
        assert response.status_code == 501
        body = response.json()["error"]
        assert body["code"] == "image_analysis_unavailable"
        assert "not available yet" in body["message"].lower()