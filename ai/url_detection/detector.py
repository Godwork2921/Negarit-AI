"""Suspicious-URL detector.

Combines lexical structure, brand impersonation and typosquatting analysis,
and an optional third-party reputation verdict supplied by the caller.

The module never performs network access. Reputation data arrives as a
:class:`~shared.types.ReputationResult` produced by a provider outside
``ai/``, which keeps the engine testable and free of I/O.

Scoring uses the same saturating exponential as the phishing detector, so the
two families contribute comparable magnitudes to the risk engine.
"""

from __future__ import annotations

import math
import re
from urllib.parse import unquote

from shared.brands import BRANDS, de_leet
from shared.types import (
    DetectorResult,
    Indicator,
    ReputationResult,
    ReputationVerdict,
    Severity,
    SignalFamily,
    clamp_unit,
    severity_floor,
)

from .features import ParsedUrl, levenshtein, parse_url, shannon_entropy

__all__ = ["analyse", "SENSITIVITY", "MALICIOUS_CUTOFF", "SUSPICIOUS_CUTOFF"]

SENSITIVITY: float = 0.85
MALICIOUS_CUTOFF: float = 0.70
SUSPICIOUS_CUTOFF: float = 0.40

HIGH_RISK_TLDS: frozenset[str] = frozenset(
    {
        "tk", "gq", "ml", "cf", "ga", "top", "xyz", "click", "link", "icu",
        "zip", "mov", "kim", "work", "rest", "accountant", "loan", "date",
        "faith", "review", "stream", "download", "racing", "win", "bid",
        "party", "science", "gdn", "cam", "surf", "quest", "cfd",
    }
)

SHORTENER_HOSTS: frozenset[str] = frozenset(
    {
        "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
        "rebrand.ly", "cutt.ly", "shorturl.at", "rb.gy", "lnkd.in", "t.ly",
        "tiny.cc", "s.id", "shorte.st", "bl.ink", "short.io",
    }
)

SUSPICIOUS_KEYWORDS: tuple[str, ...] = (
    "login", "signin", "sign-in", "verify", "verification", "secure",
    "security", "account", "update", "confirm", "auth", "authentication",
    "billing", "payment", "pay", "checkout", "invoice", "refund", "wallet",
    "card", "transfer", "deposit", "unsubscribe", "recover", "recovery",
    "unlock", "suspended", "validate", "webscr", "support", "helpdesk",
    "customer-service",
)

CREDENTIAL_PATH_KEYWORDS: tuple[str, ...] = (
    "login", "signin", "log-in", "auth", "verify", "account", "password",
    "credential", "session", "token", "signin", "webmail",
)

REDIRECT_PARAMETERS: tuple[str, ...] = (
    "url", "redirect", "next", "return", "dest", "destination", "continue",
    "returnurl", "returnto", "goto", "target", "r", "u", "link",
)

STANDARD_PORTS: frozenset[int] = frozenset({80, 443})

_CONTROL_CHARS = re_control_chars = set(range(0x00, 0x20)) | {0x7F}


def _indicator(
    type_: str,
    severity: Severity,
    description: str,
    evidence: str | None = None,
) -> Indicator:
    return Indicator(
        type=type_,
        severity=severity,
        description=description,
        evidence=(evidence or None),
        metadata={"category": "url"},
    )


def _brand_in_text(value: str) -> str | None:
    lowered = value.lower()
    squashed = lowered.replace("-", "").replace(".", "").replace("_", "")
    best: tuple[int, str] | None = None
    for brand in BRANDS:
        if brand in lowered:
            candidate = (len(brand), brand)
        elif brand.replace(" ", "") in squashed:
            candidate = (len(brand), brand)
        else:
            continue
        if best is None or candidate[0] > best[0]:
            best = candidate
    return best[1] if best else None


def _structurally_indicators(parsed: ParsedUrl) -> list[Indicator]:
    out: list[Indicator] = []

    if not parsed.is_valid:
        return [
            _indicator(
                "url_unparseable",
                Severity.MEDIUM,
                f"This is not a usable web address ({parsed.error}).",
                parsed.raw[:120],
            )
        ]

    if parsed.is_ip_host:
        out.append(
            _indicator(
                "url_ip_host",
                Severity.HIGH,
                "The address points to a bare IP address instead of a named domain, "
                "so the operator cannot be identified.",
                parsed.hostname,
            )
        )

    if not parsed.uses_https:
        out.append(
            _indicator(
                "url_no_https",
                Severity.LOW,
                "The connection is not encrypted, so anything sent to it can be read "
                "in transit.",
                parsed.scheme_lower or "http",
            )
        )

    if "@" in parsed.netloc:
        out.append(
            _indicator(
                "url_userinfo_trick",
                Severity.CRITICAL,
                "The part before the @ sign is ignored by many browsers, so this "
                "address can appear to belong to a trusted site while going elsewhere.",
                parsed.netloc[:120],
            )
        )

    if parsed.port is not None and parsed.port not in STANDARD_PORTS:
        out.append(
            _indicator(
                "url_nonstandard_port",
                Severity.LOW,
                f"The address uses unusual port {parsed.port}.",
                str(parsed.port),
            )
        )

    if len(parsed.raw) > 75:
        out.append(
            _indicator(
                "url_excessive_length",
                Severity.LOW,
                "The address is unusually long, which is used to push the real "
                "destination out of view.",
                f"{len(parsed.raw)} characters",
            )
        )

    if len(parsed.subdomains) >= 3:
        out.append(
            _indicator(
                "url_deep_subdomains",
                Severity.MEDIUM,
                f"The address stacks {len(parsed.subdomains)} subdomain levels, "
                "often used to bury the real domain.",
                ".".join(parsed.subdomains)[:120],
            )
        )

    percent_count = parsed.raw.count("%")
    if percent_count >= 2:
        out.append(
            _indicator(
                "url_percent_encoding",
                Severity.MEDIUM,
                "The address is heavily percent-encoded, which can hide its true "
                "destination from a reader.",
                f"{percent_count} encoded sequences",
            )
        )

    if any(ord(ch) in _CONTROL_CHARS for ch in parsed.hostname):
        out.append(
            _indicator(
                "url_control_characters",
                Severity.HIGH,
                "The address contains control characters, used to confuse software "
                "that reads it differently from a browser.",
                repr(parsed.hostname)[:120],
            )
        )

    return out


def _tld_indicator(parsed: ParsedUrl) -> list[Indicator]:
    if parsed.tld in HIGH_RISK_TLDS:
        return [
            _indicator(
                "url_high_risk_tld",
                Severity.MEDIUM,
                f'The ".{parsed.tld}" top-level domain is disproportionately used for '
                "abuse and is frequently free or near-free to register.",
                f".{parsed.tld}",
            )
        ]
    return []


def _keyword_indicators(parsed: ParsedUrl) -> list[Indicator]:
    out: list[Indicator] = []
    host_words = set(re_split_words(parsed.hostname_lower))
    path_words = set(re_split_words(unquote(parsed.path).lower()))

    hits = sorted((host_words | path_words) & set(SUSPICIOUS_KEYWORDS))
    if len(hits) >= 2:
        out.append(
            _indicator(
                "url_suspicious_keywords",
                Severity.HIGH,
                "The address is loaded with account or verification wording: "
                + ", ".join(hits[:4]) + ".",
                ", ".join(hits[:4]),
            )
        )
    elif len(hits) == 1 and parsed.tld in HIGH_RISK_TLDS:
        out.append(
            _indicator(
                "url_suspicious_keywords",
                Severity.MEDIUM,
                f'The address contains the account-related word "{hits[0]}".',
                hits[0],
            )
        )

    credential_hits = sorted(path_words & set(CREDENTIAL_PATH_KEYWORDS))
    if credential_hits:
        # A word such as "login" can be caught both as generic suspicious
        # wording and as a credential path. Charging for it twice would let a
        # single ordinary sign-in link look like two independent findings, so
        # the redundant copy is reported at INFO and adds no weight.
        already_counted = bool(set(credential_hits) & set(hits))
        out.append(
            _indicator(
                "url_credential_path",
                Severity.INFO if already_counted else Severity.HIGH,
                "The address sends you to a sign-in or verification path, which is "
                "where credentials are captured.",
                credential_hits[0],
            )
        )

    query_words = set(re_split_words(unquote(parsed.query).lower()))
    redirect_hits = sorted(query_words & set(REDIRECT_PARAMETERS))
    if redirect_hits and parsed.hostname_lower in SHORTENER_HOSTS:
        out.append(
            _indicator(
                "url_redirect_chain",
                Severity.HIGH,
                "A shortened address carrying a redirect parameter can hide its "
                "final destination behind several hops.",
                redirect_hits[0],
            )
        )
    elif redirect_hits:
        out.append(
            _indicator(
                "url_redirect_parameter",
                Severity.LOW,
                "The address contains a redirect parameter, so the visible link is "
                "not the destination.",
                redirect_hits[0],
            )
        )

    if parsed.hostname_lower in SHORTENER_HOSTS:
        out.append(
            _indicator(
                "url_shortener",
                Severity.MEDIUM,
                "This is a link-shortening service, so the real destination cannot "
                "be judged from the address alone.",
                parsed.hostname_lower,
            )
        )

    return out


def re_split_words(value: str) -> list[str]:
    """Split a hostname or path into lowercase word tokens."""
    import re as _re

    return _re.split(r"[^a-z0-9]+", value.lower())


def _entropy_indicator(parsed: ParsedUrl) -> list[Indicator]:
    subdomains = parsed.subdomains
    if not subdomains:
        return []
    joined = "".join(subdomains)
    if len(joined) >= 12 and shannon_entropy(joined) >= 3.5:
        return [
            _indicator(
                "url_high_entropy_subdomain",
                Severity.MEDIUM,
                "The subdomain looks machine-generated rather than human-chosen, "
                "which is typical of domains generated for a single campaign.",
                joined[:120],
            )
        ]
    return []


def _impersonation_indicators(parsed: ParsedUrl) -> list[Indicator]:
    out: list[Indicator] = []
    if not parsed.is_valid:
        return out

    subdomains = parsed.subdomains
    registrable = parsed.registrable
    brand_already_reported: str | None = None

    if subdomains:
        subdomain_brand = _brand_in_text(".".join(subdomains))
        if subdomain_brand and subdomain_brand not in registrable:
            brand_already_reported = subdomain_brand
            out.append(
                _indicator(
                    "url_brand_in_subdomain",
                    Severity.CRITICAL,
                    f'"{subdomain_brand}" appears in the subdomain while the domain '
                    f'you actually reach is "{parsed.hostname_lower}". This address '
                    f"borrows the trust of a well-known brand.",
                    parsed.hostname_lower,
                )
            )

    path_brand = _brand_in_text(unquote(parsed.path))
    if path_brand:
        out.append(
            _indicator(
                "url_brand_in_path",
                Severity.MEDIUM,
                f'"{path_brand}" appears in the path, which is often used to make '
                "an unrelated domain look familiar.",
                path_brand,
            )
        )

    typosquat = _typosquat_indicators(parsed)
    if typosquat and (
        brand_already_reported is None
        or brand_already_reported not in typosquat[0].description
    ):
        out.extend(typosquat)
    return out


def _best_brand_match(value: str) -> tuple[str, int] | None:
    """Find the closest brand for ``value`` by edit distance.

    A budget of one edit covers the common single-character typosquats
    (``amazn``, ``paypa1``, ``microsft``). Very short brand names get a
    budget of two, since one edit on a four-letter name is rarely enough to
    be conclusive.

    Inexact matches must also agree on the first character. Real
    impersonation domains preserve it, while the constraint stops short
    generic tokens such as ``app`` from matching an unrelated short brand.
    """
    if not value:
        return None
    best: tuple[int, str] | None = None
    for brand in BRANDS:
        target = brand.replace(" ", "")
        budget = 2 if len(target) <= 4 else 1
        distance = levenshtein(value, target, cap=budget + 1)
        if distance > budget:
            continue
        if distance > 0 and value[0] != target[0]:
            continue
        if best is None or distance < best[0]:
            best = (distance, brand)
    return (best[1], best[0]) if best else None


def _brand_owns(parsed: ParsedUrl, brand: str) -> bool:
    """True when the domain is plausibly the genuine site for ``brand``."""
    target = brand.replace(" ", "")
    clean = parsed.hostname_lower.strip(".")
    if clean == target or clean.endswith("." + target):
        return True
    return parsed.registrable in {target, brand.lower()}


def _typosquat_indicators(parsed: ParsedUrl) -> list[Indicator]:
    if not parsed.is_valid or not parsed.registrable or parsed.is_ip_host:
        return []

    if parsed.homoglyph_hostname != parsed.hostname_lower:
        offending = [
            ch for ch in parsed.hostname_lower if ch not in parsed.homoglyph_hostname
        ]
        return [
            _indicator(
                "url_homoglyph",
                Severity.CRITICAL,
                "The address uses letters from another alphabet that look identical "
                "to Latin ones, so it can read as a familiar brand.",
                "".join(sorted(set(offending)))[:40],
            )
        ]

    for label in parsed.labels[:-1]:
        for token in (part for part in re.split(r"[^a-z0-9]+", label) if part):
            for variant, kind in ((token, "character"), (de_leet(token), "digit")):
                match = _best_brand_match(variant)
                if match is None:
                    continue
                brand, distance = match

                if distance == 0:
                    if _brand_owns(parsed, brand):
                        continue
                    return [
                        _indicator(
                            "url_typosquat_brand",
                            Severity.CRITICAL,
                            f'"{token}" copies the brand "{brand}" exactly, but the '
                            f'domain you actually reach is "{parsed.hostname_lower}". '
                            "This is a squatted look-alike, not the real organisation.",
                            token,
                        )
                    ]

                return [
                    _indicator(
                        "url_typosquat_brand",
                        Severity.CRITICAL,
                        f'"{token}" is only {distance} {kind} change'
                        f'{"s" if distance != 1 else ""} away from "{brand}", so it is '
                        f"most likely an impersonation of that brand rather than a typo.",
                        token,
                    )
                ]

    return []


def _reputation_indicators(reputation: ReputationResult | None) -> list[Indicator]:
    if reputation is None:
        return []
    if reputation.verdict is ReputationVerdict.MALICIOUS:
        return [
            Indicator(
                type="reputation_malicious",
                severity=Severity.CRITICAL,
                description=(
                    f"{reputation.source} reports this address as malicious"
                    + (
                        f" ({reputation.detections} security vendors detected it)."
                        if reputation.detections
                        else "."
                    )
                ),
                evidence=reputation.detail,
                simulated=False,
                metadata={"category": "threat_intel", "source": reputation.source},
            )
        ]
    if reputation.verdict is ReputationVerdict.SUSPICIOUS:
        return [
            Indicator(
                type="reputation_suspicious",
                severity=Severity.HIGH,
                description=f"{reputation.source} flags this address as suspicious.",
                evidence=reputation.detail,
                simulated=False,
                metadata={"category": "threat_intel", "source": reputation.source},
            )
        ]
    if reputation.verdict is ReputationVerdict.UNLISTED:
        return [
            Indicator(
                type="reputation_unlisted",
                severity=Severity.LOW,
                description=(
                    f"{reputation.source} has never seen this address before. That is "
                    "weak evidence on its own, but worth noting for a new domain."
                ),
                evidence=None,
                simulated=False,
                metadata={"category": "threat_intel", "source": reputation.source},
            )
        ]
    return []


def _score(indicators: list[Indicator]) -> float:
    total_weight = sum(i.effective_weight for i in indicators)
    saturated = clamp_unit(1.0 - math.exp(-total_weight / SENSITIVITY))
    return max(saturated, severity_floor(indicators))


def _classify(score: float) -> str:
    if score >= MALICIOUS_CUTOFF:
        return "malicious"
    if score >= SUSPICIOUS_CUTOFF:
        return "suspicious"
    return "benign"


def _unanalysable(url: str) -> DetectorResult:
    """Report input that cannot be parsed, without calling it safe.

    An address the parser cannot understand is an unknown quantity, not a
    clean bill of health. The result is marked unanalysable so the risk engine
    lists the web-address signal as unavailable rather than trusting a zero.
    """
    reason = "the address could not be parsed as a URL"
    return DetectorResult(
        family=SignalFamily.URL,
        classification="unknown",
        confidence=0.0,
        indicators=(
            _indicator(
                "url_unparseable",
                Severity.MEDIUM,
                "The address could not be parsed, so it could not be checked. "
                "Treat it as unverified rather than safe.",
                url[:120],
            ),
        ),
        score=0.0,
        simulated=True,
        analysable=False,
        metadata={
            "analysis_blocked_reason": reason,
            "hostname": None,
            "tld": None,
            "registrable_domain": None,
            "subdomains": [],
            "uses_https": False,
            "is_ip_host": False,
            "length": len(url),
            "reputation_applied": False,
            "feature_set_version": "lexical-0.1.0",
            "sensitivity": SENSITIVITY,
        },
    )


def analyse(
    url: str,
    *,
    reputation: ReputationResult | None = None,
) -> DetectorResult:
    """Analyse a single URL.

    Args:
        url: The address to inspect. It is parsed and never fetched.
        reputation: Optional verdict from a configured threat-intelligence
            provider. When omitted, only local analysis is performed and the
            result says so via its ``metadata``.

    Returns:
        A :class:`DetectorResult` explaining every finding.
    """
    parsed = parse_url(url)

    if not parsed.is_valid:
        return _unanalysable(url)

    indicators: list[Indicator] = []
    indicators.extend(_structurally_indicators(parsed))
    indicators.extend(_tld_indicator(parsed))
    indicators.extend(_keyword_indicators(parsed))
    indicators.extend(_entropy_indicator(parsed))
    indicators.extend(_impersonation_indicators(parsed))
    indicators.extend(_reputation_indicators(reputation))

    lexical_score = _score(indicators)
    reputation_applied = reputation is not None
    score = lexical_score
    classification = _classify(score)

    if classification == "benign":
        confidence = 0.80 if reputation_applied else 0.55
    else:
        confidence = clamp_unit(0.5 + 0.5 * score)

    return DetectorResult(
        family=SignalFamily.URL,
        classification=classification,
        confidence=confidence,
        indicators=tuple(indicators),
        score=score,
        simulated=not reputation_applied,
        metadata={
            "hostname": parsed.hostname_lower or None,
            "tld": parsed.tld or None,
            "registrable_domain": parsed.registrable or None,
            "subdomains": list(parsed.subdomains),
            "uses_https": parsed.uses_https,
            "is_ip_host": parsed.is_ip_host,
            "length": len(parsed.raw),
            "reputation_applied": reputation_applied,
            "feature_set_version": "lexical-0.1.0",
            "sensitivity": SENSITIVITY,
        },
    )
