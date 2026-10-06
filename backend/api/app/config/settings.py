"""Typed application settings, loaded from the environment.

Every configuration value the service reads lives here. No other module may
read ``os.environ`` directly, which means the full surface of tunables can be
audited from this one file, and tests can construct settings explicitly instead
of mutating process state.

Validation is deliberately strict. A service that starts with an insecure or
self-contradictory configuration is worse than one that refuses to start: the
first silently accepts bad security posture, the second is impossible to
mislead.
"""

from __future__ import annotations

import functools
import secrets
from pathlib import Path
from typing import Any, Literal

from pydantic import Field, PrivateAttr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

__all__ = ["Settings", "get_settings", "AppEnvironment"]

AppEnvironment = Literal["development", "test", "staging", "production"]

# Environments where a weak or missing secret must stop the boot.
_STRICT_ENVIRONMENTS = frozenset({"staging", "production"})

# Refuse trivially guessable signing keys regardless of environment. A
# development default would otherwise be a production incident waiting to
# happen, because the failure only shows up once someone forges a token.
_WEAK_SECRETS = frozenset(
    {
        "secret",
        "changeme",
        "change-me",
        "changethis",
        "password",
        "jwt-secret",
        "your-secret-here",
        "negarit",
    }
)


class Settings(BaseSettings):
    """Runtime configuration for the API service."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ─────────────────────────────────────────────────
    app_name: str = "Negarit AI"
    app_env: AppEnvironment = "development"
    app_version: str = "0.1.0"
    frontend_url: str = "http://localhost:3000"
    api_prefix: str = "/api/v1"
    debug: bool = False

    # ── Database ────────────────────────────────────────────────────
    database_url: str = "postgresql://negarit:negarit@localhost:5432/negarit"
    db_echo: bool = False
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_timeout: int = 30
    db_pool_recycle: int = 1800

    # ── Security ────────────────────────────────────────────────────
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 14
    # Argon2id cost parameters. Defaults follow the OWASP Password Storage
    # Cheat Sheet minimum for argon2id.
    password_hash_iterations: int = 3
    password_hash_memory_kib: int = 65536
    password_hash_parallelism: int = 4

    # ── CORS ────────────────────────────────────────────────────────
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    # ── Rate limiting ───────────────────────────────────────────────
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 60
    rate_limit_window_seconds: int = 60
    analysis_rate_limit_requests: int = 10
    analysis_rate_limit_window_seconds: int = 60

    # ── Uploads ─────────────────────────────────────────────────────
    max_upload_size_mb: int = 10
    allowed_image_mime_types: list[str] = Field(
        default_factory=lambda: ["image/jpeg", "image/png", "image/webp"]
    )
    upload_dir: str = "./storage/uploads"

    # ── Logging ─────────────────────────────────────────────────────
    log_level: str = "info"
    log_json_format: bool = False
    # Keys logged by the request middleware. Anything not on this list is
    # dropped, so a stray request body can never leak a password into logs.
    log_allowlist: list[str] = Field(
        default_factory=lambda: [
            "method",
            "path",
            "status_code",
            "duration_ms",
            "request_id",
            "client_ip",
            "user_id",
            "analysis_id",
            "user_agent",
        ]
    )

    # ── AI engine ───────────────────────────────────────────────────
    ai_offline_mode: bool = True
    ai_model_dir: str = "./ai/models"
    ai_label_simulated_signals: bool = True
    ai_engine_path: str = "../ai"

    # ── Threat intelligence ─────────────────────────────────────────
    threat_intel_enabled: bool = False
    threat_intel_timeout_seconds: int = 8
    virustotal_api_key: str = ""
    threat_intel_offline_whois: bool = True

    # ── OCR ─────────────────────────────────────────────────────────
    ocr_engine: str = "tesseract"
    ocr_languages: list[str] = Field(default_factory=lambda: ["eng"])
    ocr_min_confidence: int = 40

    # ── Optional LLM (phrasing only, never a detection signal) ──────
    llm_enabled: bool = False
    llm_api_key: str = ""
    llm_model: str = "openai/gpt-4o-mini"
    llm_base_url: str = "https://openrouter.ai/api/v1"
    llm_timeout_seconds: int = 30

    # Cached fallback signing key for development. Private so it is never
    # serialised into an API response or a settings dump.
    _ephemeral_secret: str | None = PrivateAttr(default=None)

    # ── Risk engine policy ─────────────────────────────────────────
    # These are the only place the verdict bands are defined. The detection
    # engine receives them verbatim, so retuning the product is a
    # configuration change rather than a code change.
    risk_safe_max: int = 29
    risk_suspicious_max: int = 69
    risk_weight_phishing: float = 0.30
    risk_weight_url: float = 0.25
    risk_weight_sender: float = 0.15
    risk_weight_threat_intel: float = 0.20
    risk_weight_image: float = 0.10
    risk_agreement_threshold: float = 0.50
    risk_corroboration_strength: float = 0.35
    risk_critical_bonus: float = 0.02

    # ── Validators ──────────────────────────────────────────────────

    @field_validator("cors_origins", "allowed_image_mime_types", "ocr_languages",
                     "log_allowlist", mode="before")
    @classmethod
    def _split_csv(cls, value: object) -> object:
        """Accept a comma-separated string for list-valued settings.

        Environment variables are strings, and a JSON array in a ``.env`` file
        is easy to get wrong. Accepting CSV keeps configuration readable.
        """
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return []
            if stripped.startswith("["):
                return value
            return [item.strip() for item in stripped.split(",") if item.strip()]
        return value

    @field_validator("log_level")
    @classmethod
    def _check_log_level(cls, value: str) -> str:
        level = value.lower()
        allowed = {"debug", "info", "warning", "error", "critical"}
        if level not in allowed:
            raise ValueError(f"LOG_LEVEL must be one of {sorted(allowed)}, got {value!r}")
        return level

    @field_validator("jwt_algorithm")
    @classmethod
    def _check_algorithm(cls, value: str) -> str:
        if value not in {"HS256", "HS384", "HS512"}:
            raise ValueError(f"JWT_ALGORITHM must be an HMAC SHA algorithm, got {value!r}")
        return value

    @field_validator("access_token_expire_minutes")
    @classmethod
    def _check_access_expiry(cls, value: int) -> int:
        if not 1 <= value <= 1440:
            raise ValueError("ACCESS_TOKEN_EXPIRE_MINUTES must be between 1 and 1440")
        return value

    @field_validator("max_upload_size_mb")
    @classmethod
    def _check_upload_size(cls, value: int) -> int:
        if not 1 <= value <= 50:
            raise ValueError("MAX_UPLOAD_SIZE_MB must be between 1 and 50")
        return value

    @model_validator(mode="after")
    def _check_security_posture(self) -> "Settings":
        """Refuse to run with an unusable signing key."""
        secret = self.jwt_secret.strip()

        if not secret:
            if self.app_env in _STRICT_ENVIRONMENTS:
                raise ValueError(
                    "JWT_SECRET must be set when APP_ENV is "
                    f"{self.app_env!r}. Generate one with: "
                    'python -c "import secrets; print(secrets.token_urlsafe(64))"'
                )
        else:
            if len(secret) < 32:
                raise ValueError(
                    "JWT_SECRET must be at least 32 characters long; a short key "
                    "is brute-forceable"
                )
            if secret.lower() in _WEAK_SECRETS:
                raise ValueError(
                    "JWT_SECRET is a well-known placeholder. Generate a unique "
                    'key with: python -c "import secrets; print(secrets.token_urlsafe(64))"'
                )

        if self.app_env == "production" and self.debug:
            raise ValueError("DEBUG must be false when APP_ENV is 'production'")

        # The three bands must tile 0-100 in order. An inverted pair would make
        # a band unreachable, which is a policy bug that must not reach users.
        if self.risk_safe_max >= self.risk_suspicious_max:
            raise ValueError(
                "RISK_SAFE_MAX must be lower than RISK_SUSPICIOUS_MAX "
                f"(got {self.risk_safe_max} and {self.risk_suspicious_max}). "
                "Otherwise a verdict band would be unreachable."
            )
        if not 0 <= self.risk_safe_max < self.risk_suspicious_max < 100:
            raise ValueError(
                "Risk bands must satisfy 0 <= RISK_SAFE_MAX < RISK_SUSPICIOUS_MAX < 100."
            )
        if not 0.0 <= self.risk_critical_bonus <= 1.0:
            raise ValueError("RISK_CRITICAL_BONUS must be between 0 and 1.")

        return self

    # ── Derived helpers ─────────────────────────────────────────────

    @property
    def is_production_like(self) -> bool:
        return self.app_env in _STRICT_ENVIRONMENTS

    @property
    def effective_jwt_secret(self) -> str:
        """The signing key actually used.

        In staging and production this is the configured secret, and a missing
        one has already refused to boot. In development, where refusing to start
        would only inconvenience a local machine, a random key is generated once
        per process instead. Tokens then stop working when the server restarts,
        which is the correct trade: usable locally, never guessable.
        """
        configured = self.jwt_secret.strip()
        if configured:
            return configured
        if self._ephemeral_secret is None:
            self._ephemeral_secret = secrets.token_urlsafe(64)
        return self._ephemeral_secret

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def upload_path(self) -> Path:
        return Path(self.upload_dir).resolve()

    def risk_engine_env(self) -> dict[str, str]:
        """Environment mapping handed to the ``ai`` risk engine.

        Built from these settings rather than read from the process environment,
        so the policy the service reports is exactly the policy it applied, and
        a test can pin the thresholds without mutating global state.
        """
        return {
            "RISK_SAFE_MAX": str(self.risk_safe_max),
            "RISK_SUSPICIOUS_MAX": str(self.risk_suspicious_max),
            "RISK_WEIGHT_PHISHING": str(self.risk_weight_phishing),
            "RISK_WEIGHT_URL": str(self.risk_weight_url),
            "RISK_WEIGHT_SENDER": str(self.risk_weight_sender),
            "RISK_WEIGHT_THREAT_INTEL": str(self.risk_weight_threat_intel),
            "RISK_WEIGHT_IMAGE": str(self.risk_weight_image),
            "RISK_AGREEMENT_THRESHOLD": str(self.risk_agreement_threshold),
            "RISK_CORROBORATION_STRENGTH": str(self.risk_corroboration_strength),
            "RISK_CRITICAL_BONUS": str(self.risk_critical_bonus),
        }


@functools.lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the process-wide settings, constructed once.

    Cached so that every request and every module observes the same immutable
    configuration. Tests that need different settings should build a
    ``Settings`` instance directly rather than clearing this cache.
    """
    return Settings()