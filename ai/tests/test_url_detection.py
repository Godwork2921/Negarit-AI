"""Tests for suspicious-URL detection."""

from __future__ import annotations

import pytest

from shared.types import (
    ReputationResult,
    ReputationVerdict,
    Severity,
    SignalFamily,
)
from url_detection import analyse, parse_url


class TestBenignUrls:
    def test_genuine_urls_raise_no_indicators(self, benign_urls):
        for url in benign_urls:
            result = analyse(url)
            assert result.indicators == (), f"{url} -> {[i.type for i in result.indicators]}"

    def test_brand_domains_are_not_treated_as_typosquats(self):
        for url in (
            "https://www.apple.com/shop",
            "https://login.microsoft.com",
            "https://paypal.com",
            "https://www.bankofamerica.com",
            "https://ups.com/track",
            "https://wise.com",
        ):
            result = analyse(url)
            assert "url_typosquat_brand" not in {i.type for i in result.indicators}, url

    def test_subdomains_of_a_brand_domain_are_not_impersonation(self):
        """A real brand login page is not a typosquat.

        Lexical analysis alone still sees a sign-in path, which is a known
        limitation: telling a real login page from a fake one needs a
        reputation source, not string matching.
        """
        result = analyse("https://secure.paypal.com/us/signin")
        types = {i.type for i in result.indicators}
        assert "url_typosquat_brand" not in types
        assert "url_brand_in_subdomain" not in types
        assert "url_homoglyph" not in types
        assert result.classification != "malicious"


class TestMaliciousUrls:
    def test_malicious_urls_are_flagged(self, malicious_urls):
        for url in malicious_urls:
            result = analyse(url)
            assert result.score >= 0.5, f"{url} -> {result.score}"
            assert result.classification in {"suspicious", "malicious"}, url

    @pytest.mark.parametrize(
        ("url", "expected"),
        [
            ("http://paypa1-security-example.com", "url_typosquat_brand"),
            ("http://m1crosoft-security.net/a", "url_typosquat_brand"),
            ("http://amazn.com/login", "url_typosquat_brand"),
            ("http://microsft-login.tk", "url_typosquat_brand"),
            ("http://\u0430pple.com/id", "url_homoglyph"),
            ("https://paypal.secure-login.tk/v", "url_brand_in_subdomain"),
            ("http://192.168.1.1/login", "url_ip_host"),
            ("http://user@evil.test", "url_userinfo_trick"),
        ],
    )
    def test_expected_indicator_is_raised(self, url, expected):
        assert expected in {i.type for i in analyse(url).indicators}

    def test_typosquat_is_critical(self):
        result = analyse("http://paypa1-security-example.com")
        typosquat = next(i for i in result.indicators if i.type == "url_typosquat_brand")
        assert typosquat.severity is Severity.CRITICAL
        assert result.has_critical


class TestStructureDetection:
    def test_plain_http_is_flagged(self):
        assert "url_no_https" in {i.type for i in analyse("http://example.com").indicators}

    def test_high_risk_tld_is_flagged(self):
        """A single weak signal is reported without overstating the verdict.

        This mirrors the phishing engine: one medium finding should not on its
        own manufacture a suspicious verdict.
        """
        result = analyse("https://some-site.tk/index")
        tld = next(i for i in result.indicators if i.type == "url_high_risk_tld")
        assert tld.severity is Severity.MEDIUM
        assert result.score > 0.0
        assert result.score < 0.5

    def test_credential_path_is_flagged(self):
        result = analyse("https://example.com/account/login")
        assert "url_credential_path" in {i.type for i in result.indicators}

    def test_shortener_is_flagged(self):
        assert "url_shortener" in {i.type for i in analyse("https://bit.ly/x").indicators}

    def test_deep_subdomains_are_flagged(self):
        result = analyse("https://a.b.c.example.com/")
        assert "url_deep_subdomains" in {i.type for i in result.indicators}

    def test_long_url_is_flagged(self):
        long_url = "https://example.com/" + "a" * 120
        assert "url_excessive_length" in {i.type for i in analyse(long_url).indicators}

    def test_malformed_url_is_reported_as_unknown_not_safe(self):
        """Unparseable input must never come back as a clean result.

        This is the rule that an unavailable check is not a passed check.
        """
        result = analyse("ftp://files.example.com/pub")
        assert "url_unparseable" in {i.type for i in result.indicators}
        assert result.classification == "unknown"
        assert result.analysable is False
        assert result.as_signal().available is False

    @pytest.mark.parametrize("bad", ["", "   ", "http://", "https://:80"])
    def test_unparseable_inputs_are_marked_unavailable(self, bad):
        result = analyse(bad)
        assert result.analysable is False
        assert result.as_signal().available is False
        assert result.as_signal().score == 0.0


class TestParsing:
    def test_missing_scheme_is_tolerated(self):
        parsed = parse_url("example.com/path")
        assert parsed.is_valid
        assert parsed.hostname == "example.com"
        assert parsed.scheme_lower == "http"

    def test_case_is_normalised(self):
        parsed = parse_url("HTTPS://EXAMPLE.COM/Path")
        assert parsed.hostname_lower == "example.com"
        assert parsed.scheme_lower == "https"

    def test_registrable_and_subdomains(self):
        parsed = parse_url("https://a.b.example.co.uk/x")
        assert parsed.registrable == "co"
        assert parsed.subdomains == ("a", "b", "example")

    def test_ip_detection(self):
        assert parse_url("http://8.8.8.8/").is_ip_host
        assert parse_url("http://[::1]/").is_ip_host
        assert not parse_url("https://example.com/").is_ip_host


class TestReputation:
    def test_malicious_reputation_is_critical(self):
        result = analyse(
            "https://unknown-site.example/",
            reputation=ReputationResult(
                verdict=ReputationVerdict.MALICIOUS,
                source="VirusTotal",
                detections=12,
            ),
        )
        assert result.has_critical
        assert "reputation_malicious" in {i.type for i in result.indicators}

    def test_without_reputation_result_is_marked_simulated(self):
        assert analyse("https://example.com/").simulated is True

    def test_with_reputation_result_is_not_simulated(self):
        result = analyse(
            "https://example.com/",
            reputation=ReputationResult(
                verdict=ReputationVerdict.CLEAN, source="VirusTotal"
            ),
        )
        assert result.simulated is False

    def test_clean_reputation_does_not_subtract(self):
        without = analyse("https://example-security-login.tk/x")
        with_clean = analyse(
            "https://example-security-login.tk/x",
            reputation=ReputationResult(
                verdict=ReputationVerdict.CLEAN, source="VirusTotal"
            ),
        )
        assert with_clean.score >= without.score


class TestProperties:
    def test_score_always_in_unit_range(self, malicious_urls, benign_urls):
        for url in [*malicious_urls, *benign_urls]:
            assert 0.0 <= analyse(url).score <= 1.0

    def test_result_is_deterministic(self, malicious_urls):
        for url in malicious_urls:
            first, second = analyse(url), analyse(url)
            assert first.score == second.score

    def test_family_and_metadata(self):
        result = analyse("https://example.com/")
        assert result.family is SignalFamily.URL
        assert result.metadata["hostname"] == "example.com"
        assert result.metadata["uses_https"] is True

    def test_metadata_is_always_present(self):
        result = analyse("https://example.com/")
        assert result.metadata["feature_set_version"] == "lexical-0.1.0"