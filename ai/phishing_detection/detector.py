"""Phishing-language detector.

Scores a message against the rule library in :mod:`lexicon` plus a set of
orthographic checks, and returns a :class:`~shared.types.DetectorResult`
carrying every individual finding.

The module is a pure function of its input: no network access, no database,
no model loading, no randomness. The same message always yields the same
indicators and the same score.

Scoring uses a saturating exponential rather than a raw sum so that many
weak signals cannot on their own masquerade as strong evidence, while several
independent strong signals do compound:

.. math::

    score = 1 - e^{-W / k}

where :math:`W` is the sum of indicator weights and :math:`k` is the
sensitivity constant from configuration.
"""

from __future__ import annotations

import math
import re

from shared.extractors import (
    capital_ratio,
    exclamation_ratio,
    extract_emails,
    extract_phone_numbers,
    extract_urls,
    has_mixed_scripts,
    normalise_text,
)
from shared.types import (
    DetectorResult,
    Indicator,
    Severity,
    SignalFamily,
    clamp_unit,
    severity_floor,
)

from .lexicon import BRANDS, LEET_SUBSTITUTIONS, RULES, Rule

__all__ = ["analyse", "SENSITIVITY", "PHISHING_CUTOFF", "SUSPICIOUS_CUTOFF"]

SENSITIVITY: float = 0.90
PHISHING_CUTOFF: float = 0.72
SUSPICIOUS_CUTOFF: float = 0.40

_LEET_TARGETS: tuple[str, ...] = (
    "password", "passcode", "verify", "account", "secure", "login",
    "update", "confirm", "payment", "billing", "signin", "authenticate",
    "credentials", "support", "banking",
)
_FREE_EMAIL_DOMAINS: frozenset[str] = frozenset(
    {
        "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
        "icloud.com", "mail.com", "gmx.com", "protonmail.com", "proton.me",
        "yandex.com", "zoho.com", "example.com", "test.com", "temp-mail.org",
    }
)


def _leet_form(word: str) -> str:
    return "".join(LEET_SUBSTITUTIONS.get(ch, ch) for ch in word.lower())


def _deleet_variant(text: str) -> str:
    """Return a copy of ``text`` with digit and symbol substitutions folded back.

    Attackers routinely write ``ver1fy your acc0unt p4ssw0rd`` to slip past
    literal keyword matching. Rules are run against both the original text and
    this folded copy, and findings from either are kept.
    """
    folded_words: list[str] = []
    for token in text.split():
        stripped = "".join(ch for ch in token if ch.isalnum())
        if len(stripped) < 4 or not any(ch in LEET_SUBSTITUTIONS for ch in stripped):
            folded_words.append(token)
            continue
        folded = _leet_form(stripped)
        if folded == stripped.lower():
            folded_words.append(token)
        else:
            folded_words.append(
                token.replace(stripped, folded) if stripped in token else folded
            )
    return " ".join(folded_words)


def _orthographic_indicators(text: str) -> list[Indicator]:
    """Findings derived from how the text is written rather than what it says."""
    out: list[Indicator] = []

    if len(text) >= 25 and capital_ratio(text) > 0.60:
        out.append(
            Indicator(
                type="writing_all_caps",
                severity=Severity.LOW,
                description=(
                    "The message is written almost entirely in capital letters, "
                    "a common pressure tactic."
                ),
                evidence=None,
            )
        )

    if exclamation_ratio(text) > 0.30:
        out.append(
            Indicator(
                type="writing_excessive_exclamation",
                severity=Severity.LOW,
                description="Excessive exclamation marks are used to manufacture urgency.",
                evidence=None,
            )
        )

    if has_mixed_scripts(text):
        out.append(
            Indicator(
                type="writing_mixed_script",
                severity=Severity.HIGH,
                description=(
                    "The text mixes Latin letters with look-alike characters from "
                    "other alphabets, a technique used to disguise a name."
                ),
                evidence=None,
            )
        )

    for word in text.split():
        stripped = "".join(ch for ch in word if ch.isalnum())
        if len(stripped) < 4 or not any(ch in LEET_SUBSTITUTIONS for ch in stripped):
            continue
        decoded = _leet_form(stripped)
        if decoded != stripped.lower() and decoded in _LEET_TARGETS:
            out.append(
                Indicator(
                    type="writing_character_substitution",
                    severity=Severity.MEDIUM,
                    description=(
                        f'The word "{stripped}" uses digit or symbol substitutions '
                        f"to spell \"{decoded}\", a technique used to bypass text filters."
                    ),
                    evidence=stripped,
                )
            )
            break

    return out


def _rule_indicators(text: str) -> list[Indicator]:
    out: list[Indicator] = []
    for rule in RULES:
        evidence = rule.search(text)
        if evidence is not None:
            out.append(
                Indicator(
                    type=rule.key,
                    severity=rule.severity,
                    description=rule.description,
                    evidence=evidence[:120],
                    metadata={"category": rule.category},
                )
            )
    return out


def _brand_indicators(text: str) -> list[Indicator]:
    lowered = text.lower()
    mentioned = [brand for brand in BRANDS if brand in lowered]
    if not mentioned:
        return []

    brand = mentioned[0]
    return [
        Indicator(
            type="impersonation_brand",
            severity=Severity.MEDIUM,
            description=(
                f'The message references "{brand}", so it may be impersonating '
                "that organisation."
            ),
            evidence=brand,
        )
    ]


def _is_brand_registrable(domain: str, brand: str) -> bool:
    """True when ``domain`` is genuinely owned by ``brand``.

    Comparison is done on the registrable label so that a TLD does not defeat
    it: ``microsoft.com`` and ``login.microsoft.com`` are genuine, while
    ``totally-not-microsoft.xyz`` and ``microsoft-secure.tk`` are not.
    """
    clean = domain.lower().strip().strip(".")
    brand_clean = brand.lower().strip()
    if clean == brand_clean or clean.endswith("." + brand_clean):
        return True

    labels = clean.split(".")
    if len(labels) < 2:
        return False

    registrable = labels[-2]
    return registrable in {brand_clean, brand_clean.replace(" ", "")}


def _looks_like_brand_domain(domain: str) -> str | None:
    """Return the brand a domain appears to reference without being owned by."""
    clean = domain.lower().strip().strip(".")
    if not clean:
        return None
    for brand in BRANDS:
        brand_clean = brand.lower()
        if _is_brand_registrable(clean, brand_clean):
            continue
        if brand_clean in clean or brand_clean.replace(" ", "") in clean:
            return brand
    return None


def _sender_indicators(
    text: str,
    sender_email: str | None,
    domain: str | None,
) -> list[Indicator]:
    out: list[Indicator] = []

    if sender_email and "@" in sender_email:
        local_part, sender_domain = sender_email.rsplit("@", 1)
        sender_domain = sender_domain.lower()
        local_lower = local_part.lower()

        if sender_domain in _FREE_EMAIL_DOMAINS:
            out.append(
                Indicator(
                    type="sender_free_email_domain",
                    severity=Severity.MEDIUM,
                    description=(
                        f'The sender uses the free mailbox domain "{sender_domain}" '
                        "rather than an organisation's own domain."
                    ),
                    evidence=sender_domain,
                )
            )

        if re.search(r"(?i)(?:no[\s_-]?reply|do[\s_-]?not[\s_-]?reply|noreply|postmaster|abuse)", local_lower):
            out.append(
                Indicator(
                    type="impersonation_no_reply",
                    severity=Severity.LOW,
                    description=(
                        f'The sender address "{sender_email}" is an unmonitored '
                        "no-reply mailbox, so the organisation cannot be reached back."
                    ),
                    evidence=sender_email,
                )
            )

        spoofed_brand = _looks_like_brand_domain(sender_domain)
        if spoofed_brand is not None:
            out.append(
                Indicator(
                    type="sender_domain_brand_spoof",
                    severity=Severity.CRITICAL,
                    description=(
                        f'The sending domain "{sender_domain}" contains the name '
                        f'"{spoofed_brand}" but is not a genuine {spoofed_brand} '
                        "address. This is sender impersonation."
                    ),
                    evidence=sender_domain,
                )
            )

        lowered = text.lower()
        for brand in BRANDS:
            if brand in lowered and not _is_brand_registrable(sender_domain, brand):
                out.append(
                    Indicator(
                        type="sender_domain_brand_mismatch",
                        severity=Severity.HIGH,
                        description=(
                            f'The message claims to be from "{brand}" but was sent '
                            f'from "{sender_domain}", which is not a {brand} address.'
                        ),
                        evidence=sender_domain,
                    )
                )
                break

    if domain:
        spoofed_brand = _looks_like_brand_domain(domain)
        if spoofed_brand is not None:
            out.append(
                Indicator(
                    type="sender_domain_brand_spoof",
                    severity=Severity.CRITICAL,
                    description=(
                        f'The supplied domain "{domain}" contains the name '
                        f'"{spoofed_brand}" but is not a genuine {spoofed_brand} '
                        "address."
                    ),
                    evidence=domain,
                )
            )
        lowered = text.lower()
        for brand in BRANDS:
            if brand in lowered and not _is_brand_registrable(domain, brand):
                out.append(
                    Indicator(
                        type="sender_domain_brand_mismatch",
                        severity=Severity.HIGH,
                        description=(
                            f'The message references "{brand}" but the supplied '
                            f'domain "{domain}" does not belong to that organisation.'
                        ),
                        evidence=domain,
                    )
                )
                break

    return out


def _link_indicators(text: str, urls: list[str]) -> list[Indicator]:
    if not urls:
        return []
    out = [
        Indicator(
            type="link_present",
            severity=Severity.LOW,
            description=(
                f"The message contains {len(urls)} web address"
                f"{'s' if len(urls) != 1 else ''} that lead away from the message."
            ),
            evidence=urls[0][:120],
        )
    ]
    if extract_emails(text) and any("@" not in u.split("/", 1)[0] for u in urls):
        out.append(
            Indicator(
                type="link_display_text_mismatch",
                severity=Severity.HIGH,
                description=(
                    "The message shows a trusted sender address while also linking "
                    "to a different web address, a common spoofing technique."
                ),
                evidence=None,
            )
        )
    return out


def _contact_indicators(text: str) -> list[Indicator]:
    phones = extract_phone_numbers(text)
    if not phones:
        return []
    return [
        Indicator(
            type="contact_phone_present",
            severity=Severity.LOW,
            description=(
                "The message includes a phone number, which invites the recipient "
                "to call an attacker-controlled line."
            ),
            evidence=phones[0],
        )
    ]


def _score(indicators: list[Indicator]) -> float:
    total_weight = sum(i.effective_weight for i in indicators)
    saturated = clamp_unit(1.0 - math.exp(-total_weight / SENSITIVITY))
    return max(saturated, severity_floor(indicators))


def _classify(score: float) -> str:
    if score >= PHISHING_CUTOFF:
        return "phishing"
    if score >= SUSPICIOUS_CUTOFF:
        return "suspicious"
    return "benign"


def _confidence(classification: str, score: float, indicator_count: int) -> float:
    if classification == "benign":
        if indicator_count == 0:
            return 0.85
        return clamp_unit(1.0 - score)
    return clamp_unit(0.5 + 0.5 * score)


def analyse(
    text: str,
    *,
    sender_email: str | None = None,
    domain: str | None = None,
) -> DetectorResult:
    """Analyse ``text`` for phishing characteristics.

    Args:
        text: The raw message body.
        sender_email: Optional claimed sender address, used for brand/domain
            mismatch detection.
        domain: Optional claimed sending domain.

    Returns:
        A :class:`DetectorResult` whose ``indicators`` explain the score.
    """
    normalised = normalise_text(text or "")
    urls = extract_urls(normalised)

    indicators: list[Indicator] = []
    indicators.extend(_rule_indicators(normalised))

    deleeted = _deleet_variant(normalised)
    if deleeted != normalised:
        seen_types = {i.type for i in indicators}
        for recovered in _rule_indicators(deleeted):
            if recovered.type not in seen_types:
                indicators.append(recovered)
                seen_types.add(recovered.type)

    indicators.extend(_orthographic_indicators(normalised))
    indicators.extend(_brand_indicators(normalised))
    indicators.extend(_sender_indicators(normalised, sender_email, domain))
    indicators.extend(_link_indicators(normalised, urls))
    indicators.extend(_contact_indicators(normalised))

    score = _score(indicators)
    classification = _classify(score)

    return DetectorResult(
        family=SignalFamily.PHISHING,
        classification=classification,
        confidence=_confidence(classification, score, len(indicators)),
        indicators=tuple(indicators),
        score=score,
        # This detector is a local rule set. It never consults an external
        # source, so its findings are always heuristics rather than confirmed
        # facts, and the risk engine is told so.
        simulated=True,
        metadata={
            "character_count": len(normalised),
            "detected_urls": urls,
            "rule_version": "rules-0.1.0",
            "sensitivity": SENSITIVITY,
        },
    )