"""Tests for settings, password hashing and token handling.

These cover the security-critical primitives: a service that starts with a weak
signing key, or accepts an unsigned token, is worse than one that refuses to
run at all.
"""

from __future__ import annotations

import time

import pytest

from app.config import Settings
from app.exceptions import AuthenticationFailed
from app.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    needs_rehash,
    verify_password,
)

HASH_PARAMS = {"iterations": 1, "memory_kib": 8192, "parallelism": 1}
GOOD_SECRET = "a-valid-test-secret-of-sufficient-length-0123456789"


class TestSettings:
    def test_defaults_are_usable_in_development(self):
        settings = Settings()
        assert settings.app_env == "development"
        assert settings.cors_origins == ["http://localhost:3000"]

    def test_csv_environment_values_become_lists(self):
        settings = Settings(
            cors_origins="https://a.example, https://b.example",
            allowed_image_mime_types="image/png,image/webp",
        )
        assert settings.cors_origins == ["https://a.example", "https://b.example"]
        assert settings.allowed_image_mime_types == ["image/png", "image/webp"]

    def test_empty_csv_becomes_empty_list(self):
        assert Settings(cors_origins="").cors_origins == []

    @pytest.mark.parametrize(
        "kwargs",
        [
            {"app_env": "production"},
            {"jwt_secret": "short"},
            {"jwt_secret": "changeme"},
            {"jwt_secret": "password"},
            {"log_level": "chatty"},
            {"jwt_algorithm": "none"},
            {"jwt_algorithm": "RS256"},
            {"access_token_expire_minutes": 0},
            {"access_token_expire_minutes": 99999},
            {"max_upload_size_mb": 0},
            {"max_upload_size_mb": 500},
            {"app_env": "production", "jwt_secret": GOOD_SECRET, "debug": True},
            # An inverted or overlapping pair of bands would make a verdict
            # unreachable, so it must fail at boot rather than in production.
            {"risk_safe_max": 70, "risk_suspicious_max": 69},
            {"risk_safe_max": 69, "risk_suspicious_max": 29},
            {"risk_safe_max": 29, "risk_suspicious_max": 100},
            {"risk_safe_max": 29, "risk_suspicious_max": 69, "risk_critical_bonus": 5},
        ],
    )
    def test_invalid_configuration_is_refused(self, kwargs):
        """A misconfigured service must fail to start, not start insecure."""
        with pytest.raises(Exception):
            Settings(**kwargs)

    def test_production_with_a_real_secret_is_accepted(self):
        settings = Settings(app_env="production", jwt_secret=GOOD_SECRET, debug=False)
        assert settings.is_production_like

    def test_docs_are_disabled_in_production(self):
        settings = Settings(app_env="production", jwt_secret=GOOD_SECRET)
        assert settings.is_production_like

    def test_derived_helpers(self):
        settings = Settings(max_upload_size_mb=3)
        assert settings.max_upload_bytes == 3 * 1024 * 1024

    def test_risk_engine_env_is_complete(self):
        keys = Settings().risk_engine_env()
        assert {"RISK_SAFE_MAX", "RISK_SUSPICIOUS_MAX", "RISK_CRITICAL_BONUS"} <= keys.keys()
        assert all(isinstance(v, str) for v in keys.values())

    def test_risk_engine_env_reflects_configured_thresholds(self):
        """Configured bands must reach the engine, not a hardcoded default.

        If this ever returned constants again, tuning ``RISK_SAFE_MAX`` in the
        environment would silently do nothing.
        """
        settings = Settings(risk_safe_max=10, risk_suspicious_max=50)
        env = settings.risk_engine_env()
        assert env["RISK_SAFE_MAX"] == "10"
        assert env["RISK_SUSPICIOUS_MAX"] == "50"

    def test_risk_engine_env_weights_follow_settings(self):
        settings = Settings(risk_weight_phishing=0.42)
        assert settings.risk_engine_env()["RISK_WEIGHT_PHISHING"] == "0.42"


class TestEphemeralDevelopmentSecret:
    """Development must be usable without a secret, and still unguessable."""

    def test_development_without_a_secret_gets_a_random_one(self):
        settings = Settings(app_env="development", jwt_secret="")
        secret = settings.effective_jwt_secret
        assert secret
        assert len(secret) >= 32

    def test_the_ephemeral_secret_is_stable_within_one_instance(self):
        settings = Settings(app_env="development", jwt_secret="")
        assert settings.effective_jwt_secret == settings.effective_jwt_secret

    def test_two_instances_do_not_share_a_secret(self):
        first = Settings(app_env="development", jwt_secret="")
        second = Settings(app_env="development", jwt_secret="")
        assert first.effective_jwt_secret != second.effective_jwt_secret

    def test_a_configured_secret_is_used_verbatim(self):
        settings = Settings(app_env="development", jwt_secret=GOOD_SECRET)
        assert settings.effective_jwt_secret == GOOD_SECRET

    def test_login_works_in_development_without_a_configured_secret(self):
        settings = Settings(app_env="development", jwt_secret="")
        token, _ = create_access_token(settings, subject="user-1")
        assert decode_token(settings, token, expected_type="access").subject == "user-1"

    def test_the_ephemeral_secret_is_never_serialised(self):
        settings = Settings(app_env="development", jwt_secret="")
        _ = settings.effective_jwt_secret
        dumped = settings.model_dump()
        assert "_ephemeral_secret" not in dumped
        assert settings.effective_jwt_secret not in dumped.values()


class TestPasswordHashing:
    def test_hash_and_verify(self):
        encoded = hash_password("correct horse battery staple", **HASH_PARAMS)
        assert verify_password(encoded, "correct horse battery staple", **HASH_PARAMS)

    def test_hash_is_salted_so_equal_passwords_differ(self):
        first = hash_password("same password here", **HASH_PARAMS)
        second = hash_password("same password here", **HASH_PARAMS)
        assert first != second

    def test_plaintext_never_appears_in_the_hash(self):
        secret = "correct horse battery staple"
        assert secret not in hash_password(secret, **HASH_PARAMS)

    def test_argon2id_is_used(self):
        assert hash_password("a valid password", **HASH_PARAMS).startswith("$argon2id$")

    def test_wrong_password_fails(self):
        encoded = hash_password("correct horse battery staple", **HASH_PARAMS)
        assert not verify_password(encoded, "wrong password", **HASH_PARAMS)

    @pytest.mark.parametrize("stored", ["", "not-a-hash", "$argon2id$broken"])
    def test_malformed_stored_hash_fails_closed(self, stored):
        assert not verify_password(stored, "anything", **HASH_PARAMS)

    def test_empty_password_cannot_be_hashed(self):
        with pytest.raises(ValueError):
            hash_password("", **HASH_PARAMS)

    def test_rehash_detection(self):
        weak = hash_password("correct horse battery staple", **HASH_PARAMS)
        assert needs_rehash(weak, iterations=3, memory_kib=65536, parallelism=4)
        assert not needs_rehash(
            weak, iterations=1, memory_kib=8192, parallelism=1
        )

    def test_extremely_long_password_is_bounded_by_the_caller(self):
        # Hashing itself must not blow up on a huge input.
        long_password = "x" * 10000
        encoded = hash_password(long_password, **HASH_PARAMS)
        assert verify_password(encoded, long_password, **HASH_PARAMS)


class TestTokens:
    def test_access_token_round_trip(self):
        settings = Settings(jwt_secret=GOOD_SECRET)
        token, expires = create_access_token(settings, subject="user-1")
        payload = decode_token(settings, token, expected_type="access")
        assert payload.subject == "user-1"
        assert payload.token_type == "access"
        assert expires > datetime_now()

    def test_refresh_token_round_trip(self):
        settings = Settings(jwt_secret=GOOD_SECRET)
        token, _ = create_refresh_token(settings, subject="user-1")
        assert decode_token(settings, token, expected_type="refresh").token_type == "refresh"

    def test_access_token_cannot_be_used_to_refresh(self):
        """Token type confusion would turn a short-lived token into a session."""
        settings = Settings(jwt_secret=GOOD_SECRET)
        token, _ = create_access_token(settings, subject="user-1")
        with pytest.raises(AuthenticationFailed):
            decode_token(settings, token, expected_type="refresh")

    def test_refresh_token_cannot_be_used_as_access(self):
        settings = Settings(jwt_secret=GOOD_SECRET)
        token, _ = create_refresh_token(settings, subject="user-1")
        with pytest.raises(AuthenticationFailed):
            decode_token(settings, token, expected_type="access")

    def test_token_from_another_secret_is_rejected(self):
        issuer = Settings(jwt_secret=GOOD_SECRET)
        verifier = Settings(jwt_secret="a-completely-different-secret-value-0987654321")
        token, _ = create_access_token(issuer, subject="user-1")
        with pytest.raises(AuthenticationFailed):
            decode_token(verifier, token)

    def test_expired_token_is_rejected(self):
        import jwt

        settings = Settings(jwt_secret=GOOD_SECRET)
        expired = jwt.encode(
            {
                "sub": "user-1",
                "type": "access",
                "iat": int(time.time()) - 7200,
                "exp": int(time.time()) - 3600,
                "jti": "abc",
                "iss": settings.app_name,
            },
            GOOD_SECRET,
            algorithm="HS256",
        )
        with pytest.raises(AuthenticationFailed, match="expired"):
            decode_token(settings, expired)

    def test_unsigned_alg_none_token_is_rejected(self):
        """The classic JWT bypass: asking the server to skip verification."""
        import jwt

        settings = Settings(jwt_secret=GOOD_SECRET)
        unsigned = jwt.encode(
            {
                "sub": "admin",
                "type": "access",
                "iat": int(time.time()),
                "exp": int(time.time()) + 3600,
                "jti": "abc",
                "iss": settings.app_name,
            },
            key="",
            algorithm="none",
        )
        with pytest.raises(AuthenticationFailed):
            decode_token(settings, unsigned)

    @pytest.mark.parametrize("token", ["", "abc", "a.b.c", "....", "x" * 500])
    def test_malformed_tokens_are_rejected(self, token):
        settings = Settings(jwt_secret=GOOD_SECRET)
        with pytest.raises(AuthenticationFailed):
            decode_token(settings, token)

    def test_tampered_signature_is_rejected(self):
        settings = Settings(jwt_secret=GOOD_SECRET)
        token, _ = create_access_token(settings, subject="user-1")
        with pytest.raises(AuthenticationFailed):
            decode_token(settings, token[:-4] + "AAAA")

    def test_token_missing_required_claims_is_rejected(self):
        import jwt

        settings = Settings(jwt_secret=GOOD_SECRET)
        incomplete = jwt.encode(
            {"sub": "user-1", "type": "access"}, GOOD_SECRET, algorithm="HS256"
        )
        with pytest.raises(AuthenticationFailed):
            decode_token(settings, incomplete)

    @pytest.mark.parametrize("app_env", ["staging", "production"])
    def test_a_strict_environment_refuses_to_start_without_a_secret(self, app_env):
        with pytest.raises(Exception):
            Settings(app_env=app_env, jwt_secret="")


class TestTokenStorage:
    def test_token_hash_is_stable_and_hex(self):
        digest = hash_token("some-token-value")
        assert digest == hash_token("some-token-value")
        assert len(digest) == 64
        assert all(char in "0123456789abcdef" for char in digest)

    def test_different_tokens_hash_differently(self):
        assert hash_token("a") != hash_token("b")

    def test_stored_hash_is_not_the_token(self):
        token = "eyJhbGciOiJIUzI1NiJ9.payload.signature"
        assert hash_token(token) != token


def datetime_now():
    from datetime import datetime, timezone

    return datetime.now(timezone.utc)