"""Lexical feature extraction for URL analysis.

Everything here works on the URL string alone — no DNS, no HTTP, no WHOIS.
The module deliberately never fetches a submitted URL; doing so would make
the backend an SSSS proxy into whatever a user pasted.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from urllib.parse import unquote, urlsplit

__all__ = [
    "ParsedUrl",
    "parse_url",
    "shannon_entropy",
    "levenshtein",
    "is_ip_host",
    "registrable_label",
]

_IPV4 = re.compile(r"^\d{1,3}(?:\.\d{1,3}){3}$")
_HOMOGLYPHS: dict[str, str] = {
    "\u0430": "a", "\u0435": "e", "\u043e": "o", "\u0440": "p", "\u0441": "c",
    "\u0445": "x", "\u0443": "y", "\u0439": "i", "\u0456": "i", "\u0458": "j",
    "\u03bf": "o", "\u03b1": "a", "\u03b5": "e", "\u03c1": "p", "\u03c5": "u",
    "\u0131": "i", "\u0130": "i", "\u0261": "g", "\u04cf": "l", "\u2010": "-",
    "\u2011": "-", "\u2013": "-", "\u2014": "-", "\u2212": "-",
}
_LEET: dict[str, str] = {"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t"}


@dataclass(frozen=True, slots=True)
class ParsedUrl:
    """Structural breakdown of a URL."""

    raw: str
    scheme: str
    netloc: str
    hostname: str
    port: int | None
    path: str
    query: str
    labels: tuple[str, ...]
    tld: str
    scheme_lower: str
    hostname_lower: str
    is_valid: bool
    error: str | None = None

    @property
    def registrable(self) -> str:
        """Best-effort registrable domain (``a.b.example.co.uk`` -> ``example``)."""
        if len(self.labels) >= 2:
            return self.labels[-2]
        return self.hostname_lower

    @property
    def subdomains(self) -> tuple[str, ...]:
        if len(self.labels) >= 3:
            return tuple(self.labels[:-2])
        return ()

    @property
    def uses_https(self) -> bool:
        return self.scheme_lower == "https"

    @property
    def is_ip_host(self) -> bool:
        return is_ip_host(self.hostname)

    @property
    def de_leeted_hostname(self) -> str:
        return "".join(_LEET.get(ch, ch) for ch in self.hostname_lower)

    @property
    def homoglyph_hostname(self) -> str:
        """Hostname with cross-alphabet look-alikes mapped to Latin only.

        Deliberately does not fold digit substitutions: ``paypa1`` is leet
        evasion rather than a homoglyph, and the two are reported differently.
        """
        return "".join(_HOMOGLYPHS.get(ch, ch) for ch in self.hostname_lower)

    @property
    def folded_hostname(self) -> str:
        """Hostname with both homoglyphs and leet substitutions mapped."""
        return "".join(
            _HOMOGLYPHS.get(ch, _LEET.get(ch, ch)) for ch in self.hostname_lower
        )


def parse_url(url: str) -> ParsedUrl:
    """Split ``url`` into components, tolerating a missing scheme.

    A parse failure is represented in the returned object rather than raised,
    so the detector can still report *why* a string is not a usable URL.
    """
    raw = (url or "").strip()
    candidate = raw if re.match(r"(?i)^[a-z][a-z0-9+.-]*://", raw) else f"http://{raw}"

    try:
        parts = urlsplit(candidate)
    except ValueError as exc:
        return ParsedUrl(
            raw=raw, scheme="", netloc="", hostname="", port=None, path="",
            query="", labels=(), tld="", scheme_lower="", hostname_lower="",
            is_valid=False, error=str(exc),
        )

    if parts.scheme.lower() not in {"http", "https"}:
        return ParsedUrl(
            raw=raw, scheme=parts.scheme, netloc=parts.netloc, hostname="",
            port=None, path=parts.path, query=parts.query, labels=(), tld="",
            scheme_lower=parts.scheme.lower(), hostname_lower="",
            is_valid=False,
            error=f"scheme '{parts.scheme}' is not http or https",
        )

    try:
        hostname = parts.hostname or ""
        port = parts.port
    except ValueError as exc:
        return ParsedUrl(
            raw=raw, scheme=parts.scheme, netloc=parts.netloc, hostname="",
            port=None, path=parts.path, query=parts.query, labels=(), tld="",
            scheme_lower=parts.scheme.lower(), hostname_lower="",
            is_valid=False, error=str(exc),
        )

    if not hostname:
        return ParsedUrl(
            raw=raw, scheme=parts.scheme, netloc=parts.netloc, hostname="",
            port=parts.port, path=parts.path, query=parts.query, labels=(),
            tld="", scheme_lower=parts.scheme.lower(), hostname_lower="",
            is_valid=False, error="no host in URL",
        )

    hostname_lower = hostname.lower()
    labels = tuple(label for label in hostname_lower.split(".") if label)

    return ParsedUrl(
        raw=raw,
        scheme=parts.scheme,
        netloc=parts.netloc,
        hostname=hostname,
        port=port,
        path=parts.path,
        query=parts.query,
        labels=labels,
        tld=labels[-1] if len(labels) > 1 else "",
        scheme_lower=parts.scheme.lower(),
        hostname_lower=hostname_lower,
        is_valid=True,
    )


def shannon_entropy(value: str) -> float:
    """Shannon entropy in bits per character."""
    if not value:
        return 0.0
    counts: dict[str, int] = {}
    for ch in value:
        counts[ch] = counts.get(ch, 0) + 1
    total = len(value)
    entropy = 0.0
    for count in counts.values():
        probability = count / total
        entropy -= probability * math.log2(probability)
    return entropy


def levenshtein(source: str, target: str, *, cap: int = 4) -> int:
    """Edit distance between two strings, short-circuiting above ``cap``."""
    if abs(len(source) - len(target)) > cap:
        return cap + 1
    if source == target:
        return 0

    previous = list(range(len(target) + 1))
    for i, s_char in enumerate(source, start=1):
        current = [i]
        for j, t_char in enumerate(target, start=1):
            current.append(
                min(
                    previous[j] + 1,
                    current[j - 1] + 1,
                    previous[j - 1] + (s_char != t_char),
                )
            )
        previous = current
        if min(previous) > cap:
            return cap + 1
    return previous[-1]


def is_ip_host(hostname: str) -> bool:
    """True for a literal IPv4 or bracketed IPv6 host."""
    host = (hostname or "").strip("[]")
    if _IPV4.match(host):
        return all(0 <= int(part) <= 255 for part in host.split("."))
    return ":" in host


def registrable_label(parsed: ParsedUrl) -> str:
    """The label that identifies the organisation, without the TLD."""
    return parsed.registrable


def decoded_path(parsed: ParsedUrl) -> str:
    return unquote(parsed.path)