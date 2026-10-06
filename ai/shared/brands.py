"""Brand names used to detect impersonation and typosquatting.

Shared by the phishing and URL detectors so a brand is defined in exactly one
place. Keeping this list in one module prevents the two detectors from
drifting apart and disagreeing about what counts as an impersonated brand.
"""

from __future__ import annotations

__all__ = ["BRANDS", "LEET_SUBSTITUTIONS", "de_leet"]

BRANDS: tuple[str, ...] = (
    "paypal", "apple", "icloud", "microsoft", "office365", "outlook", "hotmail",
    "amazon", "netflix", "facebook", "instagram", "whatsapp", "telegram",
    "linkedin", "tiktok", "snapchat", "twitter", "google", "gmail", "dropbox",
    "docusign", "adobe", "steam", "roblox", "discord", "coinbase", "binance",
    "metamask", "revolut", "wise", "chase", "wellsfargo", "bankofamerica",
    "citibank", "barclays", "santander", "hsbc", "lloyds", "natwest",
    "westernunion", "fedex", "ups", "dhl", "usps", "royalmail", "hmrc",
    "irs", "visa", "mastercard", "amex", "netbank", "absa", "standardbank",
)

LEET_SUBSTITUTIONS: dict[str, str] = {
    "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s",
}


def de_leet(value: str) -> str:
    """Map digit and symbol substitutions back to their letter equivalents."""
    return "".join(LEET_SUBSTITUTIONS.get(ch, ch) for ch in value.lower())