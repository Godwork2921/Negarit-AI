"""Tests for phishing-language detection."""

from __future__ import annotations

import pytest

from phishing_detection import analyse
from shared.types import Severity, SignalFamily


class TestSafeMessages:
    def test_ordinary_message_raises_no_indicators(self, benign_messages):
        for message in benign_messages:
            result = analyse(message)
            assert result.indicators == (), message
            assert result.classification == "benign", message
            assert result.score == 0.0, message

    def test_safe_message_is_not_overconfident(self):
        result = analyse("Your meeting is scheduled for tomorrow at 10:00 AM.")
        assert result.confidence <= 0.85


class TestPhishingMessages:
    def test_every_phishing_message_raises_indicators(self, phishing_messages):
        for message in phishing_messages:
            result = analyse(message)
            assert result.indicators, message
            assert result.score > 0.0, message

    def test_strong_phishing_messages_are_classified_phishing(self):
        strong = [
            "URGENT: Your bank account will be suspended. Click immediately to "
            "verify your account: http://example-security-login.com",
            "URGENT: Verify your account password immediately or it will be closed",
            "Your parcel is on hold. Pay the redelivery fee and confirm your "
            "credit card details now",
        ]
        for message in strong:
            result = analyse(message)
            assert result.classification == "phishing", message
            assert result.score >= 0.70, message

    def test_bank_suspension_example(self):
        result = analyse(
            "URGENT: Your bank account will be suspended. Click immediately to "
            "verify your account: http://example-security-login.com"
        )
        types = {i.type for i in result.indicators}
        assert "urgency_immediate" in types
        assert "threat_account_suspension" in types
        assert "credential_verify" in types

    def test_indicators_carry_matched_evidence(self):
        result = analyse("URGENT: verify your account immediately")
        urgency = next(i for i in result.indicators if i.type == "urgency_immediate")
        assert urgency.evidence == "URGENT"

    def test_every_indicator_has_a_user_facing_description(self, phishing_messages):
        for message in phishing_messages:
            for indicator in analyse(message).indicators:
                assert indicator.description.strip()
                assert indicator.description[0].isupper()
                assert indicator.type.strip()


class TestSeverityFloors:
    def test_credential_request_is_critical(self):
        result = analyse("Verify your account password immediately")
        assert result.has_critical
        assert result.score >= 0.75

    def test_sole_weak_signal_stays_low(self):
        result = analyse("Please update your profile picture.")
        assert not result.has_critical
        assert result.score < 0.40


class TestEvasionResistance:
    @pytest.mark.parametrize(
        "obfuscated",
        [
            "Please ver1fy your acc0unt immediately",
            "Please VER1FY YOUR ACCOUNT NOW",
            "Please ver!fy your acc0unt immed!ately",
        ],
    )
    def test_leet_evasion_is_recovered(self, obfuscated):
        result = analyse(obfuscated)
        types = {i.type for i in result.indicators}
        assert "credential_verify" in types or "writing_character_substitution" in types

    def test_mixed_script_spoofing_is_detected(self):
        result = analyse("Please verify your account at p\u0430ypal-secure.tk now")
        assert "writing_mixed_script" in {i.type for i in result.indicators}

    def test_character_substitution_is_reported(self):
        result = analyse("Send your p4ssw0rd here")
        assert "writing_character_substitution" in {i.type for i in result.indicators}


class TestSenderImpersonation:
    @pytest.mark.parametrize(
        "sender_email",
        [
            "alerts@microsoft.com",
            "no-reply@login.microsoft.com",
            "noreply@paypal.com",
            "alerts@apple.com",
            "support@bankofamerica.com",
        ],
    )
    def test_genuine_senders_are_not_flagged(self, sender_email):
        result = analyse("Verify your account.", sender_email=sender_email)
        spoof = [i for i in result.indicators if i.type == "sender_domain_brand_spoof"]
        assert not spoof, sender_email

    @pytest.mark.parametrize(
        "sender_email",
        [
            "alerts@totally-not-microsoft.xyz",
            "x@microsoft-secure.tk",
            "a@paypal-verification.gq",
            "billing@apple-support-login.ga",
        ],
    )
    def test_spoofed_senders_are_flagged_critically(self, sender_email):
        result = analyse("Verify your account.", sender_email=sender_email)
        spoof = [i for i in result.indicators if i.type == "sender_domain_brand_spoof"]
        assert spoof, sender_email
        assert spoof[0].severity is Severity.CRITICAL

    def test_free_mailbox_domain_is_flagged(self):
        result = analyse("Hello", sender_email="bank.alert.urgent@gmail.com")
        assert "sender_free_email_domain" in {i.type for i in result.indicators}


class TestDeterminism:
    def test_repeated_calls_are_identical(self, phishing_messages):
        for message in phishing_messages:
            first, second = analyse(message), analyse(message)
            assert first.score == second.score
            assert [i.type for i in first.indicators] == [i.type for i in second.indicators]

    def test_result_declares_its_family(self):
        result = analyse("hello")
        assert result.family is SignalFamily.PHISHING
        assert result.metadata["rule_version"].startswith("rules-")


class TestEdgeCases:
    @pytest.mark.parametrize("empty", ["", "   ", "\n\n", None])
    def test_empty_input_is_safe_not_an_error(self, empty):
        result = analyse(empty)
        assert result.classification == "benign"
        assert result.score == 0.0

    def test_very_long_input_is_handled(self):
        result = analyse("word " * 20000)
        assert 0.0 <= result.score <= 1.0

    def test_unicode_input_is_handled(self):
        result = analyse("こんにちは、会議は明日の10時です。")
        assert 0.0 <= result.score <= 1.0