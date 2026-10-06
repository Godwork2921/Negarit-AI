"""Tests for the shared extraction helpers.

Everything downstream depends on these: a link that is never extracted is
never analysed, and a contact detail mistaken for a link becomes false
evidence of redirection.
"""

from __future__ import annotations

import pytest

from shared.extractors import (
    capital_ratio,
    detect_language,
    exclamation_ratio,
    extract_emails,
    extract_phone_numbers,
    extract_urls,
    has_mixed_scripts,
    normalise_text,
)


class TestExtractUrls:
    def test_scheme_urls(self):
        assert extract_urls("go to https://example.com/login") == [
            "https://example.com/login"
        ]

    def test_bare_domain_without_scheme(self):
        assert extract_urls("visit example.com now") == ["example.com"]

    def test_www_prefix(self):
        assert extract_urls("see www.example.org/path") == ["www.example.org/path"]

    def test_multiple_urls_keep_source_order(self):
        text = "first https://a.example.com then http://b.example.org/x"
        assert extract_urls(text) == ["https://a.example.com", "http://b.example.org/x"]

    def test_query_and_fragment_are_kept(self):
        url = "http://x.com/a?b=c#d"
        assert extract_urls(f"see {url}") == [url]

    def test_port_is_kept(self):
        assert extract_urls("http://192.168.0.1:8080/admin") == [
            "http://192.168.0.1:8080/admin"
        ]

    def test_trailing_sentence_punctuation_is_trimmed(self):
        assert extract_urls("visit https://example.com/login.") == [
            "https://example.com/login"
        ]

    def test_deobfuscated_scheme(self):
        assert extract_urls("go to hxxps://paypa1.com/login") == [
            "paypa1.com/login"
        ]

    def test_duplicates_are_collapsed(self):
        assert extract_urls("https://x.com/a and https://x.com/a/") == [
            "https://x.com/a"
        ]

    @pytest.mark.parametrize(
        "text", ["", "   ", "no links here", "call 555-0100 instead"]
    )
    def test_text_without_links(self, text):
        assert extract_urls(text) == []

    def test_email_domain_is_not_treated_as_a_link(self):
        """The domain half of an address must not become a redirect."""
        assert extract_urls("write to support@evil-bank-secure.co now") == []

    def test_email_and_real_link_coexist(self):
        assert extract_urls("mail me at a.b+tag@gmail.com or visit https://x.com") == [
            "https://x.com"
        ]

    def test_very_long_input(self):
        assert len(extract_urls("https://example.com " * 5000)) == 1


class TestExtractEmails:
    def test_simple_address(self):
        assert extract_emails("write to alice@example.com") == ["alice@example.com"]

    def test_address_is_lowercased(self):
        assert extract_emails("Alice@Example.COM") == ["alice@example.com"]

    def test_dotted_and_tagged_local_part(self):
        assert extract_emails("a.b+tag@gmail.com") == ["a.b+tag@gmail.com"]

    def test_several_addresses_are_deduplicated(self):
        assert extract_emails("a@x.com and A@X.com") == ["a@x.com"]

    @pytest.mark.parametrize("text", ["", "no address", "@example.com"])
    def test_text_without_addresses(self, text):
        assert extract_emails(text) == []


class TestExtractPhones:
    def test_international_number(self):
        assert extract_phone_numbers("call +44 20 7946 0958") == ["+44 20 7946 0958"]

    def test_plain_number(self):
        assert extract_phone_numbers("call 555 0100 1234") == ["555 0100 1234"]

    def test_no_false_positive_on_years(self):
        assert extract_phone_numbers("in 1998 nothing happened") == []

    def test_empty_text(self):
        assert extract_phone_numbers("") == []


class TestLanguageAndScript:
    def test_english_detected(self):
        assert detect_language("Please verify your account and confirm the details") == "en"

    def test_other_languages_detected(self):
        assert detect_language("votre compte est bloque, merci de verifier") == "fr"
        assert detect_language("su cuenta esta bloqueada, por favor verifique") == "es"

    def test_unknown_text_is_reported_not_guessed(self):
        assert detect_language("1234 !!!") == "und"
        assert detect_language("") == "und"

    def test_mixed_script_is_reported(self):
        assert has_mixed_scripts("p\u0430ypal") is True

    def test_pure_latin_is_not_mixed(self):
        assert has_mixed_scripts("paypal") is False

    def test_cyrillic_only_word_is_not_mixed(self):
        assert has_mixed_scripts("\u043f\u0440\u0438\u0432\u0435\u0442") is False


class TestRatios:
    def test_capital_ratio(self):
        assert capital_ratio("ALL CAPS") == 1.0
        assert capital_ratio("all lower") == 0.0
        assert capital_ratio("") == 0.0

    def test_exclamation_ratio_rises_with_shouting(self):
        assert exclamation_ratio("stop! now! act!") > exclamation_ratio("stop now act")


class TestNormaliseText:
    def test_whitespace_is_collapsed(self):
        assert normalise_text("a   b\n\tc") == "a b c"

    def test_control_characters_are_removed(self):
        assert "\x00" not in normalise_text("a\x00b")

    def test_unicode_is_preserved(self):
        assert normalise_text("caf\u00e9") == "caf\u00e9"

    def test_empty_input(self):
        assert normalise_text("") == ""