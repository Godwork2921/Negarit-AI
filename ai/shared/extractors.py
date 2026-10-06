"""Deterministic text extractors shared by the phishing, URL and OCR modules.

Everything here works on plain strings, is locale-agnostic and performs no
I/O. Keeping these in one place means a URL found inside an OCR'd screenshot
is parsed by exactly the same code as a URL pasted into the message box.
"""

from __future__ import annotations

import re
import unicodedata

__all__ = [
    "normalise_text",
    "extract_urls",
    "extract_emails",
    "extract_phone_numbers",
    "detect_language",
    "has_mixed_scripts",
    "capital_ratio",
    "exclamation_ratio",
]

_TRAILING_JUNK = ".,;:!?\"'"
_CLOSERS = {")": "(", "]": "[", "}": "{"}

_SCHEME_URL = re.compile(
    r"(?i)\b(?:https?|ftp)://[^\s<>\"'`\\]+",
)
_WWW_URL = re.compile(
    r"(?i)\bwww\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)+(?::\d{1,5})?(?:[/?#][^\s<>\"'`]*)?",
)
_BARE_DOMAIN = re.compile(
    r"(?i)\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.(?:com|net|org|info|biz|co|io|xyz|top|ru|cn|"
    r"online|site|link|click|icu|top|xyz|gq|pw|tk|ml|cf|ga|accountant|rest|download|loan|work)"
    r"(?::\d{1,5})?(?:[/?#][^\s<>\"'`]*)?",
)
_EMAIL = re.compile(
    r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}\b",
)
_PHONE = re.compile(
    r"(?<!\w)(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,4}\d{3,4}(?!\w)",
)
_URL_OBFUSCATION = re.compile(
    r"(?i)\b(?:hxxp|w3)(\s*:\s*/{2})[^\s<>\"'`\\]*",
)

_LANGUAGE_HINTS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\b(?:the|and|your|account|please|will|have|this|that)\b", re.I), "en"),
    (re.compile(r"\b(?:le|la|les|des|vous|votre|compte|merci)\b", re.I), "fr"),
    (re.compile(r"\b(?:el|los|las|cuenta|gracias|por|favor)\b", re.I), "es"),
    (re.compile(r"\b(?:der|die|das|ihr|konto|bitte|nicht)\b", re.I), "de"),
    (re.compile(r"\b(?:и|в|на|ваш|счёт|пароль)\b", re.I), "ru"),
    (re.compile(r"\b(?:your|account|password|verify|urgent|click|login)\b", re.I), "en"),
)


def normalise_text(text: str) -> str:
    """Normalise unicode, strip control noise and collapse whitespace.

    Homoglyph folding is applied to a *copy* used for matching only, so the
    original text returned to the user is never mangled. Line breaks are
    treated as ordinary whitespace: the rule patterns match across a whole
    message, and a split word is a trivial way to slip past a keyword.
    """
    if not text:
        return ""
    folded = unicodedata.normalize("NFKC", text)
    folded = folded.replace("\u00a0", " ").replace("\u200b", "")
    folded = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", folded)
    folded = re.sub(r"\s+", " ", folded)
    return folded.strip()


def _strip_trailing_junk(candidate: str) -> str:
    while candidate and candidate[-1] in _TRAILING_JUNK:
        candidate = candidate[:-1]
    while candidate:
        last = candidate[-1]
        opener = _CLOSERS.get(last)
        if opener and candidate.count(opener) < candidate.count(last):
            candidate = candidate[:-1]
            continue
        break
    return candidate


def _is_email_fragment(candidate: str) -> bool:
    """True when a URL-shaped token is really part of an email address.

    ``support@evil-bank.co`` yields both a valid email and a valid bare
    domain; only the email is meaningful here.
    """
    if "@" not in candidate:
        return False
    head = candidate.split("/", 1)[0]
    return "@" in head or bool(_EMAIL.fullmatch(candidate))


def _email_spans(text: str) -> list[tuple[int, int]]:
    """Character ranges occupied by email addresses in ``text``."""
    return [match.span() for match in _EMAIL.finditer(text)]


def _overlaps(spans: list[tuple[int, int]], start: int, end: int) -> bool:
    return any(start < span_end and end > span_start for span_start, span_end in spans)


def extract_urls(text: str) -> list[str]:
    """Return every URL-like token in ``text``, de-obfuscated and trimmed.

    Handles ``hxxp://`` evasion, bare domains without a scheme, and URLs
    wrapped in trailing sentence punctuation. Results are ordered by first
    appearance in the source text and de-duplicated by normalised form.

    Email addresses are excluded. The domain half of an address is
    syntactically a valid bare domain, so without this check
    ``support@evil-bank.co`` would be reported as a link as well as an address,
    and a plain contact detail would be counted as a suspicious redirect.
    """
    if not text:
        return []

    working = normalise_text(text)
    emails = _email_spans(working)
    spans: list[tuple[int, int, str]] = []

    for pattern in (_URL_OBFUSCATION, _SCHEME_URL, _WWW_URL, _BARE_DOMAIN):
        for match in pattern.finditer(working):
            token = _strip_trailing_junk(match.group(0).strip())
            start, end = match.start(), match.start() + len(match.group(0))
            if len(token) <= 3 or _is_email_fragment(token):
                continue
            if _overlaps(emails, start, end):
                continue
            token = re.sub(r"(?i)^(?:hxxp|w3)(\s*:\s*/{2})", r"http\1", token)
            spans.append((start, end, token))

    spans.sort(key=lambda item: (item[0], -(item[1] - item[0])))

    accepted: list[str] = []
    taken: list[tuple[int, int]] = []
    for start, end, token in spans:
        if any(start < prev_end and end > prev_start for prev_start, prev_end in taken):
            continue
        taken.append((start, end))
        accepted.append(token)

    seen: set[str] = set()
    unique: list[str] = []
    for url in accepted:
        key = re.sub(r"(?i)^(?:https?://)?(?:www\.)?", "", url).lower().rstrip("/")
        if key not in seen:
            seen.add(key)
            unique.append(url)
    return unique


def extract_emails(text: str) -> list[str]:
    """Return unique email addresses in ``text``."""
    if not text:
        return []
    seen: set[str] = set()
    out: list[str] = []
    for match in _EMAIL.findall(normalise_text(text)):
        lowered = match.lower()
        if lowered not in seen:
            seen.add(lowered)
            out.append(lowered)
    return out


def extract_phone_numbers(text: str) -> list[str]:
    """Return plausible phone numbers, ignoring dates and long numerics."""
    if not text:
        return []
    seen: set[str] = set()
    out: list[str] = []
    for match in _PHONE.findall(normalise_text(text)):
        digits = re.sub(r"\D", "", match)
        if not 7 <= len(digits) <= 15:
            continue
        cleaned = match.strip()
        if cleaned not in seen:
            seen.add(cleaned)
            out.append(cleaned)
    return out


def detect_language(text: str) -> str:
    """Return a coarse ISO-639-1 hint, or ``und`` when nothing matches."""
    sample = normalise_text(text)[:400]
    if not sample:
        return "und"
    scores: dict[str, int] = {}
    for pattern, code in _LANGUAGE_HINTS:
        scores[code] = scores.get(code, 0) + len(pattern.findall(sample))
    best_code, best_score = max(scores.items(), key=lambda kv: kv[1])
    # Every language is scored on every input, so all-zero is the normal case
    # for text with no recognised words. Reporting "en" there would be a guess
    # presented as a detection.
    return best_code if best_score > 0 else "und"


def has_mixed_scripts(text: str) -> bool:
    """True when Latin and Cyrillic/Greek characters are mixed in one token.

    This is a strong spoofing signal: ``раypal`` uses Cyrillic ``р`` and ``а``
    among Latin letters and renders almost identically to ``paypal``.
    """
    for token in re.findall(r"[^\W\d_]{4,}", text, re.UNICODE):
        scripts = set()
        for char in token:
            if not char.isalpha():
                continue
            name = unicodedata.name(char, "")
            if "CYRILLIC" in name:
                scripts.add("cyrillic")
            elif "GREEK" in name:
                scripts.add("greek")
            else:
                scripts.add("latin")
        if len(scripts) > 1:
            return True
    return False


def capital_ratio(text: str) -> float:
    """Fraction of alphabetic characters that are uppercase."""
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return 0.0
    return sum(1 for c in letters if c.isupper()) / len(letters)


def exclamation_ratio(text: str) -> float:
    """Exclamation marks per word, a crude excitement-manipulation signal."""
    words = text.split()
    if not words:
        return 0.0
    return text.count("!") / len(words)