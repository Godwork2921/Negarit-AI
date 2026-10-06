"""Turn a risk assessment into an explanation and a set of actions.

The explanation is a product feature, not a debug output. It must answer
three questions in plain language: *how bad is it*, *why*, and *what should I
do about it right now*.

Everything is produced from the indicators that were actually raised, so the
narrative can never disagree with the score.
"""

from __future__ import annotations

from collections.abc import Sequence

from shared.types import Indicator, RiskLevel, Severity, SignalFamily

from .scoring import RiskAssessment

__all__ = ["build_explanation", "recommend_actions", "family_label"]

_SEVERITY_ORDER: tuple[Severity, ...] = (
    Severity.CRITICAL,
    Severity.HIGH,
    Severity.MEDIUM,
    Severity.LOW,
    Severity.INFO,
)

_FAMILY_LABEL: dict[SignalFamily, str] = {
    SignalFamily.PHISHING: "message wording",
    SignalFamily.URL: "web address",
    SignalFamily.SENDER: "sender identity",
    SignalFamily.THREAT_INTEL: "reputation data",
    SignalFamily.IMAGE: "image analysis",
}

_CRITICAL_ACTIONS: tuple[tuple[tuple[str, ...], str], ...] = (
    (
        (
            "credential_verify", "credential_enter", "credential_login",
            "credential_update", "credential_otp",
        ),
        "Do not enter your password, PIN or any one-time code. No legitimate "
        "organisation asks for these over a link.",
    ),
    (
        (
            "financial_transfer", "financial_gift_card", "financial_crypto",
            "financial_lottery", "financial_refund",
        ),
        "Do not send money, gift cards or cryptocurrency. Transfers of this kind "
        "cannot be reversed.",
    ),
    (
        ("url_typosquat_brand", "url_brand_in_subdomain", "url_homoglyph",
         "url_brand_in_path"),
        "Do not use this link. If you need the organisation, type its address "
        "into your browser yourself or use its official app.",
    ),
    (
        ("instruct_attachment", "instruct_security_disable"),
        "Do not open the attachment or change your security settings.",
    ),
    (
        ("sender_domain_brand_spoof", "sender_domain_brand_mismatch",
         "writing_mixed_script"),
        "Do not reply to this sender. Verify the organisation through a channel "
        "you already trust.",
    ),
)

_GENERAL_ACTIONS: dict[RiskLevel, tuple[str, ...]] = {
    RiskLevel.DANGEROUS: (
        "Do not click any link in this message.",
        "Do not provide personal information or credentials.",
        "Delete the message and report it as phishing.",
        "Verify the organisation through an official channel you already use.",
    ),
    RiskLevel.SUSPICIOUS: (
        "Do not click any link in this message.",
        "Verify the sender through an official channel before acting.",
        "Report the message if you did not expect it.",
    ),
    RiskLevel.SAFE: (
        "Nothing alarming was detected, but stay alert if the message asks for "
        "money or credentials.",
    ),
}


def family_label(family: SignalFamily) -> str:
    return _FAMILY_LABEL.get(family, family.value)


def _ranked(indicators: Sequence[Indicator]) -> list[Indicator]:
    order = {severity: index for index, severity in enumerate(_SEVERITY_ORDER)}
    return sorted(indicators, key=lambda i: order[i.severity])


def _primary_reasons(assessment: RiskAssessment, limit: int = 5) -> list[Indicator]:
    seen: set[str] = set()
    chosen: list[Indicator] = []
    for indicator in _ranked(assessment.indicators):
        if indicator.type in seen:
            continue
        seen.add(indicator.type)
        chosen.append(indicator)
        if len(chosen) >= limit:
            break
    return chosen


def _caveats(assessment: RiskAssessment) -> list[str]:
    notes: list[str] = []
    # When nothing could be analysed the lead sentence has already named the
    # missing checks, so repeating them here would only add noise.
    if assessment.unavailable_families and assessment.strongest_family is not None:
        names = ", ".join(family_label(f) for f in assessment.unavailable_families)
        notes.append(
            f"No data was available for: {names}. This result may change once "
            "those checks can run."
        )
    if assessment.is_simulated:
        notes.append(
            "At least one signal came from local heuristic analysis rather than a "
            "live reputation source."
        )
    if not assessment.indicators and not assessment.unavailable_families:
        notes.append(
            "No known phishing patterns matched. This is not a guarantee that the "
            "message is genuine."
        )
    return notes


def _level_sentence(assessment: RiskAssessment) -> str:
    """Describe the verdict, without ever claiming more certainty than held.

    A low score means nothing was found, which is only the same as "safe" when
    the checks actually ran. The wording distinguishes two very different
    situations: content that was checked and came back clean, and content that
    no detector was able to look at. A missing optional provider is reported as
    a caveat, not as a failure to analyse.
    """
    if assessment.level is RiskLevel.SAFE and assessment.strongest_family is None:
        names = ", ".join(
            family_label(f) for f in assessment.unavailable_families
        )
        return (
            "This content could not be analysed, so it has not been judged safe. "
            f"None of the expected checks could run: {names}."
        )
    return {
        RiskLevel.DANGEROUS: "This is very likely a fraudulent message. Do not act on it.",
        RiskLevel.SUSPICIOUS: "This message has suspicious characteristics and warrants caution.",
        RiskLevel.SAFE: "No significant threat indicators were found in this content.",
    }[assessment.level]


def build_explanation(assessment: RiskAssessment) -> str:
    """Write a plain-language summary of the verdict and its basis."""
    parts: list[str] = []

    level_sentence = _level_sentence(assessment)

    if assessment.strongest_family is not None and assessment.signals[
        assessment.strongest_family
    ].score > 0:
        label = family_label(assessment.strongest_family)
        evidence = assessment.signals[assessment.strongest_family].score
        level_sentence += (
            f" The strongest evidence came from the {label} ({evidence:.0%} risk)."
        )
    parts.append(level_sentence)

    # Only findings justify the phrase "why we flagged this". A SAFE result, or
    # an input that could not be analysed, has nothing to defend.
    reasons = _primary_reasons(assessment) if assessment.level is not RiskLevel.SAFE else []
    if reasons:
        findings = "; ".join(
            indicator.description.rstrip(".") for indicator in reasons
        )
        corroboration = ""
        if len(assessment.corroborating_families) > 1:
            names = ", ".join(
                family_label(f) for f in assessment.corroborating_families
            )
            corroboration = f" More than one independent check agreed ({names}), which is why the score is high."
        parts.append(f"Why we flagged this: {findings}.{corroboration}")

    parts.extend(_caveats(assessment))
    return " ".join(parts)


def recommend_actions(assessment: RiskAssessment) -> list[str]:
    """Return ordered, deduplicated actions appropriate to the verdict."""
    actions: list[str] = []

    for types, action in _CRITICAL_ACTIONS:
        if any(indicator.type in types for indicator in assessment.indicators):
            actions.append(action)

    for action in _GENERAL_ACTIONS[assessment.level]:
        if action not in actions:
            actions.append(action)

    return actions