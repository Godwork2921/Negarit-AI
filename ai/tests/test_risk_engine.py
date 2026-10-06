"""Tests for threshold policy and risk aggregation.

The properties checked here are the ones the architecture promises: missing
evidence never lowers risk, nothing ever subtracts from a score, agreement
between independent families is bounded, and the same input always produces
the same verdict.
"""

from __future__ import annotations

import pytest

from phishing_detection import analyse as analyse_message
from risk_engine import (
    RiskAssessment,
    RiskConfig,
    aggregate,
    assess,
    build_explanation,
    family_label,
    load_risk_config,
    recommend_actions,
)
from shared.extractors import extract_urls
from shared.types import (
    Indicator,
    RiskLevel,
    Severity,
    SignalFamily,
    SignalScore,
)
from url_detection import analyse as analyse_url


def _indicator(severity: Severity) -> Indicator:
    return Indicator(
        type="test_signal",
        severity=severity,
        description="A test finding.",
        evidence=None,
    )


def _signal(score: float, family: SignalFamily = SignalFamily.PHISHING) -> SignalScore:
    return SignalScore(family=family, score=score, available=True)


class TestThresholdPolicy:
    def test_default_bands_match_the_specification(self):
        config = RiskConfig()
        assert config.classify(0) is RiskLevel.SAFE
        assert config.classify(29) is RiskLevel.SAFE
        assert config.classify(30) is RiskLevel.SUSPICIOUS
        assert config.classify(69) is RiskLevel.SUSPICIOUS
        assert config.classify(70) is RiskLevel.DANGEROUS
        assert config.classify(100) is RiskLevel.DANGEROUS

    def test_bands_are_configurable(self):
        config = RiskConfig(safe_max=49, suspicious_max=79)
        assert config.classify(45) is RiskLevel.SAFE
        assert config.classify(55) is RiskLevel.SUSPICIOUS
        assert config.classify(85) is RiskLevel.DANGEROUS

    def test_absurd_configuration_cannot_invert_the_bands(self):
        config = RiskConfig(safe_max=90, suspicious_max=10)
        assert config.safe_max < config.suspicious_max
        assert 0 <= config.safe_max < config.suspicious_max <= 100

    def test_environment_overrides_are_applied(self):
        config = load_risk_config({"RISK_SAFE_MAX": "39", "RISK_SUSPICIOUS_MAX": "79"})
        assert config.safe_max == 39
        assert config.suspicious_max == 79
        assert config.classify(40) is RiskLevel.SUSPICIOUS

    def test_unusable_configuration_falls_back_to_defaults(self):
        for raw in ("", "abc", "-5", "1e400"):
            config = load_risk_config({"RISK_SAFE_MAX": raw})
            assert config.safe_max == RiskConfig().safe_max, raw

    def test_every_family_has_a_weight(self):
        config = RiskConfig()
        for family in SignalFamily:
            assert family in config.weights
            assert config.weights[family] > 0.0


class TestAggregation:
    def test_no_signals_is_safe_and_trusts_nothing(self):
        result = assess([])
        assert result.score == 0
        assert result.level is RiskLevel.SAFE
        assert result.strongest_family is None

    def test_unavailable_signal_is_excluded_not_scored_zero(self):
        result = aggregate(
            {
                SignalFamily.PHISHING: _signal(0.0),
                SignalFamily.THREAT_INTEL: SignalScore.unavailable(
                    SignalFamily.THREAT_INTEL, "no provider configured"
                ),
            },
            (),
            RiskConfig(),
        )
        assert SignalFamily.THREAT_INTEL in result.unavailable_families
        assert result.signals[SignalFamily.THREAT_INTEL].score == 0.0
        assert result.signals[SignalFamily.THREAT_INTEL].available is False

    def test_a_single_strong_family_can_reach_a_band(self):
        result = assess([analyse_message("verify your password now")])
        assert result.level is RiskLevel.DANGEROUS

    def test_strongest_family_wins_over_weaker_ones(self):
        result = aggregate(
            {
                SignalFamily.PHISHING: _signal(0.20, SignalFamily.PHISHING),
                SignalFamily.URL: _signal(0.80, SignalFamily.URL),
            },
            (),
            RiskConfig(),
        )
        assert result.strongest_family is SignalFamily.URL
        assert result.score >= 80

    def test_corroboration_raises_the_score_but_never_manufactures_a_verdict(self):
        """Two quiet families agreeing stay quiet; two strong ones compound."""
        weak_alone = aggregate({SignalFamily.PHISHING: _signal(0.55)}, (), RiskConfig())
        weak_pair = aggregate(
            {
                SignalFamily.PHISHING: _signal(0.55, SignalFamily.PHISHING),
                SignalFamily.URL: _signal(0.55, SignalFamily.URL),
            },
            (),
            RiskConfig(),
        )
        assert weak_pair.score > weak_alone.score
        assert weak_pair.score < 70, "agreement must not create a dangerous verdict"

        strong_pair = aggregate(
            {
                SignalFamily.PHISHING: _signal(0.80, SignalFamily.PHISHING),
                SignalFamily.URL: _signal(0.80, SignalFamily.URL),
            },
            (),
            RiskConfig(),
        )
        assert strong_pair.score > 80
        assert strong_pair.score <= 100

    def test_families_below_the_agreement_threshold_do_not_corroborate(self):
        result = aggregate(
            {
                SignalFamily.PHISHING: _signal(0.20, SignalFamily.PHISHING),
                SignalFamily.URL: _signal(0.20, SignalFamily.URL),
            },
            (),
            RiskConfig(),
        )
        assert result.corroborating_families == ()
        assert result.score == 20

    def test_corroboration_is_bounded_by_one_hundred(self):
        families = {family: _signal(0.99, family) for family in SignalFamily}
        result = aggregate(families, (), RiskConfig())
        assert result.score <= 100

    def test_critical_indicator_adds_a_bounded_bonus(self):
        plain = aggregate({SignalFamily.PHISHING: _signal(0.50)}, (), RiskConfig())
        with_critical = aggregate(
            {SignalFamily.PHISHING: _signal(0.50)}, (_indicator(Severity.CRITICAL),), RiskConfig()
        )
        assert plain.score < with_critical.score
        assert with_critical.score <= 100
        assert with_critical.has_critical is True

    def test_score_is_always_an_integer_between_zero_and_one_hundred(self):
        families = {f: _signal(0.33, f) for f in SignalFamily}
        result = aggregate(families, (), RiskConfig())
        assert isinstance(result.score, int)
        assert 0 <= result.score <= 100


class TestMonotonicity:
    def test_raising_a_signal_never_lowers_the_score(self):
        config = RiskConfig()
        previous = -1
        for step in range(0, 101, 5):
            score = aggregate(
                {SignalFamily.PHISHING: _signal(step / 100)}, (), config
            ).score
            assert score >= previous, f"dropped at {step}"
            previous = score

    def test_adding_a_family_never_lowers_the_score(self):
        config = RiskConfig()
        single = aggregate({SignalFamily.PHISHING: _signal(0.40)}, (), config).score
        paired = aggregate(
            {
                SignalFamily.PHISHING: _signal(0.40, SignalFamily.PHISHING),
                SignalFamily.URL: _signal(0.10, SignalFamily.URL),
            },
            (),
            config,
        ).score
        assert paired >= single


class TestDeterminism:
    def test_same_input_same_score(self, phishing_messages):
        for message in phishing_messages:
            first = assess([analyse_message(message)])
            second = assess([analyse_message(message)])
            assert first.score == second.score
            assert first.level is second.level

    def test_dict_serialisation_round_trips(self):
        result = assess([analyse_message("verify your password now")])
        payload = result.to_dict()
        assert payload["risk_level"] == result.level.value
        assert payload["risk_score"] == result.score
        assert "signals" in payload


class TestExplanations:
    def test_safe_content_explains_the_absence_of_findings(self):
        result = assess([analyse_message("Your meeting is tomorrow at 10:00.")])
        text = build_explanation(result)
        assert "no significant" in text.lower()
        assert "not a guarantee" in text.lower()

    def test_dangerous_content_leads_with_action(self):
        """A message plus its link must produce an actionable verdict."""
        message = (
            "URGENT: Your account will be suspended in 2 hours. "
            "Verify your identity immediately: "
            "https://secure-login.paypal.com.evil.tk/auth"
        )
        results = [analyse_message(message), *map(analyse_url, extract_urls(message))]
        result = assess(results)
        text = build_explanation(result)
        assert result.level is RiskLevel.DANGEROUS
        assert "fraudulent" in text.lower() or "dangerous" in text.lower()
        assert "do not" in text.lower()

    def test_missing_providers_are_disclosed(self):
        result = assess(
            [analyse_message("hello")],
            extra_signals={
                SignalFamily.THREAT_INTEL: SignalScore.unavailable(
                    SignalFamily.THREAT_INTEL, "no provider configured"
                )
            },
        )
        text = build_explanation(result)
        assert "no data was available" in text.lower()
        assert "reputation" in text.lower()

    def test_input_that_could_not_be_analysed_is_never_called_safe(self):
        """A missing check must not be reported as a passed check."""
        result = assess([analyse_url("ftp://files.example.com/pub")])
        text = build_explanation(result).lower()
        assert "no significant threat indicators" not in text
        assert "could not be analysed" in text
        assert "has not been judged safe" in text

    def test_clean_content_with_a_missing_provider_is_still_called_clean(self):
        """A missing optional provider is a caveat, not a failed analysis."""
        result = assess(
            [analyse_message("Your meeting is tomorrow at 10:00.")],
            extra_signals={
                SignalFamily.THREAT_INTEL: SignalScore.unavailable(
                    SignalFamily.THREAT_INTEL, "no provider configured"
                )
            },
        )
        text = build_explanation(result).lower()
        assert "no significant threat indicators were found" in text
        assert "could not be analysed" not in text

    def test_simulated_evidence_is_disclosed(self):
        result = assess([analyse_message("verify your account now")])
        assert result.is_simulated is True
        assert "heuristic" in build_explanation(result).lower()

    def test_explanation_never_invents_a_confidence_percentage(self):
        result = assess([analyse_message("URGENT: verify your account password now")])
        assert "100%" not in build_explanation(result)

    def test_recommendations_scale_with_severity(self):
        safe = assess([analyse_message("Your meeting is tomorrow.")])
        danger = assess([analyse_message("URGENT: verify your bank password now")])
        assert len(recommend_actions(safe)) < len(recommend_actions(danger))
        assert all(action.strip() for action in recommend_actions(danger))

    def test_explanation_is_never_empty(self):
        empty = RiskAssessment(
            score=0,
            level=RiskLevel.SAFE,
            signals={},
            indicators=(),
            strongest_family=None,
            corroborating_families=(),
            unavailable_families=(),
            has_critical=False,
            config=RiskConfig(),
        )
        assert build_explanation(empty).strip()
        assert recommend_actions(empty)


class TestEndToEnd:
    def test_banking_scenario_is_dangerous(self, risk_for_text):
        assessment = risk_for_text(
            "URGENT: Your account will be suspended in 2 hours. Verify your identity "
            "immediately: https://secure-login.paypal.com.evil.tk/auth"
        )
        assert assessment.level is RiskLevel.DANGEROUS
        assert assessment.score >= 90
        assert assessment.has_critical

    @pytest.mark.parametrize("message", ["a@b.com"])
    def test_placeholder(self, message):
        pass

    def test_benign_message_is_safe_and_quiet(self, risk_for_text, benign_messages):
        for message in benign_messages:
            assessment = risk_for_text(message)
            assert assessment.score < 30, message
            assert not assessment.has_critical, message

    def test_malicious_url_alone_is_enough(self):
        assessment = assess([analyse_url("http://paypa1-security-example.com")])
        assert assessment.level is RiskLevel.DANGEROUS

    def test_legitimate_url_is_safe(self, benign_urls):
        for url in benign_urls:
            assert assess([analyse_url(url)]).score == 0, url
