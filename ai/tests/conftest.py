"""Shared pytest fixtures and offline-safe configuration."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

AI_ROOT = Path(__file__).resolve().parents[1]
if str(AI_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ROOT))

from risk_engine import RiskConfig, assess  # noqa: E402
from phishing_detection import analyse as analyse_message  # noqa: E402
from shared.extractors import extract_urls  # noqa: E402
from shared.types import SignalFamily, SignalScore  # noqa: E402
from url_detection import analyse as analyse_url  # noqa: E402


@pytest.fixture(scope="session")
def config() -> RiskConfig:
    """The documented default policy, independent of the host environment."""
    return RiskConfig()


@pytest.fixture(scope="session")
def benign_messages() -> list[str]:
    return [
        "Your meeting is scheduled for tomorrow at 10:00 AM.",
        "Reminder: the quarterly all-hands is on Friday at 14:00 in room 3B.",
        "Hi Sarah, attached is the invoice for March as agreed.",
        "The deployment finished successfully. 3 services restarted, 0 errors.",
        "Lunch at 12:30? I booked the usual place.",
        "Payment of 250 EUR was received on 3 March. Reference 9921.",
        "Can you confirm you received the security training module?",
        "Your order #4471 shipped on Monday.",
    ]


@pytest.fixture(scope="session")
def phishing_messages() -> list[str]:
    return [
        "URGENT: Your bank account will be suspended. Click immediately to "
        "verify your account: http://example-security-login.com",
        "URGENT: Your account will be suspended in 2 hours. Verify your identity "
        "immediately: https://secure-login.paypal.com.evil.tk/auth",
        "CONGRATULATIONS! You have been selected. Buy a gift card of 500 GBP and "
        "send us the code within 24 hours or you lose your prize.",
        "Your package could not be delivered. Pay the redelivery fee at "
        "http://track-parcel.tk/pay",
    ]


@pytest.fixture(scope="session")
def benign_urls() -> list[str]:
    return [
        "https://www.google.com",
        "https://github.com/anthropics",
        "https://en.wikipedia.org/wiki/Phishing",
        "https://login.microsoft.com",
        "https://www.bankofamerica.com",
        "https://news.ycombinator.com",
        "https://app.spotify.com",
        "https://www.apple.com/shop",
        "https://ups.com/track",
        "https://docs.python.org/3",
    ]


@pytest.fixture(scope="session")
def malicious_urls() -> list[str]:
    return [
        "http://paypa1-security-example.com",
        "http://m1crosoft-security.net/auth/login?token=abc",
        "http://amazn.com/login",
        "https://paypal.secure-login.tk/verify",
        "http://\u0430pple.com/id",
        "http://microsft-login.tk",
        "https://secure-login.paypal.com.evil.tk/a",
    ]


def _risk_for_text(message: str, *, sender_email: str | None = None):
    results = [analyse_message(message, sender_email=sender_email)]
    results.extend(analyse_url(url) for url in extract_urls(message))
    return assess(
        results,
        extra_signals={
            SignalFamily.THREAT_INTEL: SignalScore.unavailable(
                SignalFamily.THREAT_INTEL, "no provider configured in tests"
            )
        },
        config=RiskConfig(),
    )


@pytest.fixture(scope="session")
def risk_for_text():
    return _risk_for_text