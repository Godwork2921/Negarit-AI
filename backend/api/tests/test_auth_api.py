"""End-to-end tests for the authentication endpoints.

These run against a real in-memory database through the full HTTP stack, so they
exercise routing, dependency resolution, status codes and the error envelope
rather than just the service layer.
"""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient


class TestRegister:
    def test_register_returns_201_with_user_and_tokens(
        self, client: TestClient
    ) -> None:
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "Analyst@Example.com",
                "password": "correct horse battery staple",
                "full_name": "Test Analyst",
            },
        )
        assert response.status_code == 201, response.text
        body = response.json()

        assert body["user"]["email"] == "analyst@example.com"
        assert body["user"]["full_name"] == "Test Analyst"
        assert body["user"]["is_active"] is True
        assert body["user"]["is_admin"] is False
        uuid.UUID(body["user"]["id"])

        tokens = body["tokens"]
        assert tokens["access_token"]
        assert tokens["refresh_token"]
        assert tokens["token_type"] == "Bearer"
        assert tokens["expires_in"] > 0

    def test_password_hash_is_never_returned(self, client: TestClient) -> None:
        response = client.post(
            "/api/v1/auth/register",
            json={"email": "a@example.com", "password": "correct horse battery staple"},
        )
        assert "password" not in response.text
        assert "password_hash" not in response.text

    def test_duplicate_email_returns_409(self, client: TestClient, registered_user) -> None:
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": registered_user["email"],
                "password": "a different valid password",
            },
        )
        assert response.status_code == 409
        assert response.json()["error"]["code"] == "email_taken"

    def test_duplicate_detection_is_case_insensitive(
        self, client: TestClient, registered_user
    ) -> None:
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": registered_user["email"].upper(),
                "password": "a different valid password",
            },
        )
        assert response.status_code == 409

    @pytest.mark.parametrize(
        "password",
        [
            "short",
            "alllowercaseletters",
            "12345678901234567890",
            "               ",
        ],
    )
    def test_weak_passwords_are_rejected(self, client: TestClient, password) -> None:
        """A service that accepts ``aaaaaaa`` is not protecting anything."""
        response = client.post(
            "/api/v1/auth/register",
            json={"email": "weak@example.com", "password": password},
        )
        assert response.status_code == 422

    @pytest.mark.parametrize("email", ["", "not-an-email", "@example.com", "a@"])
    def test_invalid_emails_are_rejected(self, client: TestClient, email) -> None:
        response = client.post(
            "/api/v1/auth/register", json={"email": email, "password": "Aa1!aaaaaaaa"}
        )
        assert response.status_code == 422

    def test_missing_body_is_rejected(self, client: TestClient) -> None:
        assert client.post("/api/v1/auth/register", json={}).status_code == 422


class TestLogin:
    def test_login_succeeds_with_correct_credentials(
        self, client: TestClient, registered_user
    ) -> None:
        response = client.post(
            "/api/v1/auth/login",
            json={"email": registered_user["email"], "password": registered_user["password"]},
        )
        assert response.status_code == 200, response.text
        assert response.json()["user"]["email"] == registered_user["email"]

    def test_login_is_case_insensitive_on_email(
        self, client: TestClient, registered_user
    ) -> None:
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": registered_user["email"].upper(),
                "password": registered_user["password"],
            },
        )
        assert response.status_code == 200

    def test_wrong_password_returns_401(self, client: TestClient, registered_user) -> None:
        response = client.post(
            "/api/v1/auth/login",
            json={"email": registered_user["email"], "password": "wrong password here"},
        )
        assert response.status_code == 401

    def test_unknown_account_and_wrong_password_are_indistinguishable(
        self, client: TestClient, registered_user
    ) -> None:
        """Differentiating these turns the form into an account-enumeration oracle."""
        wrong_password = client.post(
            "/api/v1/auth/login",
            json={"email": registered_user["email"], "password": "wrong password here"},
        )
        unknown_account = client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@example.com", "password": "wrong password here"},
        )
        assert wrong_password.status_code == unknown_account.status_code == 401
        assert (
            wrong_password.json()["error"]["message"]
            == unknown_account.json()["error"]["message"]
        )
        assert (
            wrong_password.json()["error"]["code"]
            == unknown_account.json()["error"]["code"]
        )

    def test_deactivated_account_returns_403(
        self, client: TestClient, registered_user, session
    ) -> None:
        from app.models import User

        user = session.get(User, uuid.UUID(registered_user["user_id"]))
        user.is_active = False
        session.commit()

        response = client.post(
            "/api/v1/auth/login",
            json={"email": registered_user["email"], "password": registered_user["password"]},
        )
        assert response.status_code == 403


class TestRefresh:
    def test_a_new_registration_can_actually_refresh(
        self, client: TestClient, registered_user
    ) -> None:
        """Regression guard.

        Registration used to commit the user before issuing the refresh token,
        so the very first token a new user received was never written to the
        database and this call failed.
        """
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": registered_user["refresh_token"]},
        )
        assert response.status_code == 200, response.text
        assert response.json()["access_token"]

    def test_refresh_rotates_the_token(
        self, client: TestClient, registered_user
    ) -> None:
        first = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": registered_user["refresh_token"]},
        )
        assert first.status_code == 200
        rotated = first.json()["refresh_token"]
        assert rotated != registered_user["refresh_token"]

        # The new token works.
        second = client.post("/api/v1/auth/refresh", json={"refresh_token": rotated})
        assert second.status_code == 200

    def test_the_presented_token_cannot_be_reused(
        self, client: TestClient, registered_user
    ) -> None:
        """Rotation is what makes a stolen refresh token self-limiting."""
        client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": registered_user["refresh_token"]},
        )
        replay = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": registered_user["refresh_token"]},
        )
        assert replay.status_code == 401

    def test_access_token_cannot_be_used_to_refresh(
        self, client: TestClient, registered_user
    ) -> None:
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": registered_user["access_token"]},
        )
        assert response.status_code == 401

    @pytest.mark.parametrize("token", ["garbage", "a.b.c", "x" * 2000])
    def test_malformed_refresh_tokens_are_rejected(
        self, client: TestClient, token
    ) -> None:
        response = client.post("/api/v1/auth/refresh", json={"refresh_token": token})
        assert response.status_code == 401

    def test_an_empty_refresh_token_is_a_validation_error(
        self, client: TestClient
    ) -> None:
        """Rejected before the endpoint runs, so no token lookup is attempted."""
        response = client.post("/api/v1/auth/refresh", json={"refresh_token": ""})
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "validation_failed"


class TestLogout:
    def test_logout_revokes_the_session(
        self, client: TestClient, registered_user
    ) -> None:
        logout = client.post(
            "/api/v1/auth/logout",
            json={"refresh_token": registered_user["refresh_token"]},
        )
        assert logout.status_code == 200

        reused = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": registered_user["refresh_token"]},
        )
        assert reused.status_code == 401

    def test_logout_with_an_unknown_token_still_succeeds(
        self, client: TestClient
    ) -> None:
        """Reporting failure here would confirm which tokens ever existed."""
        response = client.post(
            "/api/v1/auth/logout", json={"refresh_token": "never-existed"}
        )
        assert response.status_code == 200

    def test_logout_all_revokes_every_session(
        self, client: TestClient, registered_user
    ) -> None:
        # Two independent sessions.
        second = client.post(
            "/api/v1/auth/login",
            json={
                "email": registered_user["email"],
                "password": registered_user["password"],
            },
        )
        second_refresh = second.json()["tokens"]["refresh_token"]

        response = client.post("/api/v1/auth/logout-all", headers={
            "Authorization": f"Bearer {registered_user['access_token']}"
        })
        assert response.status_code == 200
        assert response.json()["detail"]

        for token in (registered_user["refresh_token"], second_refresh):
            replay = client.post("/api/v1/auth/refresh", json={"refresh_token": token})
            assert replay.status_code == 401

    def test_logout_all_requires_authentication(self, client: TestClient) -> None:
        assert client.post("/api/v1/auth/logout-all").status_code == 401


class TestCurrentUser:
    def test_me_returns_the_authenticated_account(
        self, client: TestClient, registered_user
    ) -> None:
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {registered_user['access_token']}"},
        )
        assert response.status_code == 200
        assert response.json()["id"] == registered_user["user_id"]

    @pytest.mark.parametrize(
        "header",
        [
            {},
            {"Authorization": "Bearer"},
            {"Authorization": "Bearer not.a.token"},
            {"Authorization": "Basic YWxpY2U6cGFzcw=="},
            {"Authorization": "bearer " + "x" * 300},
        ],
    )
    def test_bad_authorization_headers_return_401(
        self, client: TestClient, header
    ) -> None:
        response = client.get("/api/v1/auth/me", headers=header)
        assert response.status_code == 401
        assert response.json()["error"]["request_id"]

    def test_refresh_token_cannot_access_me(
        self, client: TestClient, registered_user
    ) -> None:
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {registered_user['refresh_token']}"},
        )
        assert response.status_code == 401


class TestPersistence:
    def test_the_registered_password_is_stored_as_an_argon2id_hash(
        self, client: TestClient, registered_user, session
    ) -> None:
        from app.models import User

        user = session.get(User, uuid.UUID(registered_user["user_id"]))
        assert user is not None
        assert user.password_hash.startswith("$argon2id$")
        assert registered_user["password"] not in user.password_hash

    def test_refresh_tokens_are_stored_as_hashes_only(
        self, client: TestClient, registered_user, session
    ) -> None:
        from app.models import RefreshToken
        from app.security import hash_token

        rows = session.query(RefreshToken).all()
        assert rows, "expected the registration session to be persisted"
        assert all(row.token_hash == hash_token(
            registered_user["refresh_token"]
        ) for row in rows)
        assert all(registered_user["refresh_token"] not in row.token_hash for row in rows)

    def test_login_records_the_time_of_last_login(
        self, client: TestClient, registered_user, session
    ) -> None:
        from app.models import User

        client.post(
            "/api/v1/auth/login",
            json={"email": registered_user["email"], "password": registered_user["password"]},
        )
        session.expire_all()
        user = session.get(User, uuid.UUID(registered_user["user_id"]))
        assert user.last_login_at is not None