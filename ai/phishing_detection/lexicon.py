"""Rule library for phishing-language detection.

This module holds *data only* — no scoring logic. Every entry is a regular
expression or literal pattern plus the human-readable explanation shown to
the user, so that changing detection behaviour never means editing the
detector.

Coverage follows the requirement categories: urgency, fear and threat
language, credential requests, financial requests, suspicious instructions,
impersonation, social engineering, and orthographic anomalies.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from shared.brands import BRANDS, LEET_SUBSTITUTIONS
from shared.types import Severity

__all__ = ["Rule", "RULES", "BRANDS", "LEET_SUBSTITUTIONS", "category_of"]


@dataclass(frozen=True, slots=True)
class Rule:
    """One language pattern and the finding it produces."""

    key: str
    category: str
    severity: Severity
    description: str
    patterns: tuple[re.Pattern[str], ...] = field(default_factory=tuple)

    def search(self, text: str) -> str | None:
        """Return the first matched substring, or ``None``."""
        for pattern in self.patterns:
            match = pattern.search(text)
            if match:
                return match.group(0).strip()
        return None


def _r(key: str, category: str, severity: Severity, description: str, *exprs: str) -> Rule:
    return Rule(
        key=key,
        category=category,
        severity=severity,
        description=description,
        patterns=tuple(re.compile(expr, re.IGNORECASE) for expr in exprs),
    )


RULES: tuple[Rule, ...] = (
    # ── Urgency ────────────────────────────────────────────────────────
    _r(
        "urgency_immediate", "urgency", Severity.HIGH,
        "The message pushes for immediate action, limiting your time to think.",
        r"\burgent(?:ly)?\b",
        r"\bimmediat(?:e|ely)\b",
        r"\bright\s+away\b",
        r"\bas\s+soon\s+as\s+possible\b",
        r"\basap\b",
        r"\bact\s+now\b",
        r"\b(?:do\s+not|don'?t)\s+delay\b",
        r"\bhurry\b",
        r"\btime[\s-]sensitive\b",
    ),
    _r(
        "urgency_deadline", "urgency", Severity.HIGH,
        "The message imposes an artificial deadline to force a fast decision.",
        r"\bwithin\s+\d+\s*(?:hours?|hrs?|days?|minutes?|mins?)\b",
        r"\b(?:expires?|expiring|expire)\b",
        r"\b(?:final\s+(?:notice|warning)|last\s+(?:chance|warning))\b",
        r"\bbefore\s+(?:it'?s\s+too\s+late|you\s+lose\b)",
        r"\bin\s+\d+\s*(?:hours?|hrs?|days?)\b",
    ),

    # ── Fear and threat ────────────────────────────────────────────────
    _r(
        "threat_account_suspension", "fear_threat", Severity.HIGH,
        "The message threatens that your account will be suspended or closed.",
        r"\baccount\s+(?:will|would|has\s+been|may\s+be|is\s+going\s+to)\s+be\s+"
        r"(?:suspend|lock|clos|terminat|deactivat|block|freez)",
        r"\b(?:will|has\s+been|shall)\s+be\s+(?:suspended|locked|closed|terminated|"
        r"deactivated|blocked|frozen)\b",
        r"\baccess\s+(?:will\s+be|has\s+been)\s+(?:revoked|suspended|blocked|terminated)\b",
    ),
    _r(
        "threat_legal", "fear_threat", Severity.CRITICAL,
        "The message invokes legal consequences to create fear and compliance.",
        r"\b(?:legal\s+action|law\s+(?:suit|enforcement)|prosecut\w*|arrest\w*|"
        r"seiz\w*|subpoena)\b",
        r"\b(?:fines?|penalt\w*|liable\s+for)\b",
    ),
    _r(
        "threat_breach", "fear_threat", Severity.HIGH,
        "The message claims a security breach or unauthorised access occurred.",
        r"\bunusual\s+activity\s+(?:was\s+|has\s+been\s+)?detected\b",
        r"\b(?:compromi[sz]ed|unauthori[sz]ed\s+access|security\s+breach|data\s+breach)\b",
        r"\b(?:new|unknown)\s+(?:sign[\s-]?in|login|device)\b",
    ),
    _r(
        "threat_data_loss", "fear_threat", Severity.HIGH,
        "The message threatens permanent loss of data or access.",
        r"\bpermanent(?:ly)?\s+(?:los\w*|delet\w*|remov\w*)\b",
        r"\bwipe[ds]?\s+(?:your|the)\s+(?:account|data|files?)\b",
    ),

    # ── Credential requests ────────────────────────────────────────────
    _r(
        "credential_verify", "credential_request", Severity.CRITICAL,
        "The message asks you to verify your account or identity.",
        r"\bverif(?:y|ied|ication|ying)\s+(?:your|the|our)\s+"
        r"(?:account|identity|information|details|credentials|email|number|status|password)\b",
        r"\bconfirm\s+(?:your|the)\s+(?:account|identity|information|details|credentials)\b",
        r"\bvalidat(?:e|ion)\s+(?:your|the)\s+(?:account|identity|information|details)\b",
    ),
    _r(
        "credential_enter", "credential_request", Severity.CRITICAL,
        "The message asks you to enter a password, PIN or card detail.",
        r"\b(?:enter|input|provide|submit|type|re-?enter)\s+(?:your|the)\s+"
        r"(?:password|passcode|pass\s?word|pin\b|otp\b|"
        r"one[\s-]?time\s+(?:code|password|pin)|cvv|cvc\b|card\s+number|"
        r"security\s+code|credentials|login\s+details)",
    ),
    _r(
        "credential_login", "credential_request", Severity.HIGH,
        "The message directs you to sign in through a link it supplied.",
        r"\b(?:sign|log)[\s-]?in\s+(?:to|at|via|through)\b[^.!?]{0,80}?"
        r"\b(?:verif|confirm|restore|update|secure|validat|renew|reactivat)\w*",
        r"\blogin\s+(?:to|at|via)\b[^.!?]{0,60}?\b(?:account|portal|system)\b",
    ),
    _r(
        "credential_update", "credential_request", Severity.HIGH,
        "The message asks you to update stored account details.",
        r"\bupdate\s+(?:your|the)\s+(?:account\s+)?(?:details|information|records|profile|data)\b",
        r"\brenew\s+(?:your|the)\s+(?:account|subscription|membership|card)\b",
        r"\bconfirm\s+(?:your|the)\s+(?:billing|payment|address|account|personal)\s+"
        r"(?:details|information|number|records)\b",
    ),
    _r(
        "financial_card_data", "financial", Severity.CRITICAL,
        "The message asks you to confirm or supply payment card details. No "
        "organisation asks for these over an unsolicited message.",
        r"\b(?:confirm|verif|update|provide|enter|submit)\w*\s+(?:your|the)\s+"
        r"(?:credit\s+card|debit\s+card|card)\s+(?:details|number|information|data)\b",
        r"\b(?:cvv2?|cvc2?|card\s+security\s+code)\b",
        r"\b(?:sort\s+code|account\s+number)\s+and\b.*\b(?:send|enter|confirm)\b",
    ),
    _r(
        "credential_otp", "credential_request", Severity.CRITICAL,
        "The message asks for a one-time code, which no legitimate organisation needs by message.",
        r"\bone[\s-]?time\s+(?:code|password|pin)\b",
        r"\b(?:otp|2fa|mfa|authentication)\s+code\b",
        r"\bverification\s+code\b",
        r"\bsecurity\s+code\s+(?:you|received)\b",
    ),

    # ── Financial requests ─────────────────────────────────────────────
    _r(
        "financial_transfer", "financial", Severity.CRITICAL,
        "The message asks you to send money by transfer, a common fraud channel.",
        r"\b(?:wire\s+transfer|bank\s+transfer|money\s+transfer|international\s+transfer)\b",
        r"\b(?:western\s+union|money\s?gram|iban|swift\s+code)\b",
    ),
    _r(
        "financial_gift_card", "financial", Severity.CRITICAL,
        "The message asks you to buy gift cards, a hallmark of advance-fee fraud.",
        r"\b(?:gift\s+cards?|google\s+play\s+cards?|apple\s+store\s+cards?|itunes\s+cards?)\b",
        r"\bbuy\s+(?:a\s+)?(?:gift\s+card|voucher|code)\b",
    ),
    _r(
        "financial_crypto", "financial", Severity.HIGH,
        "The message requests cryptocurrency, which cannot be reversed.",
        r"\b(?:bitcoin|btc|ethereum|monero|litecoin|crypto\s?currency|cryptocurrency)\b",
        r"\bwallet\s+address\b",
    ),
    _r(
        "financial_refund", "financial", Severity.MEDIUM,
        "The message offers an unexpected refund or overpayment.",
        r"\b(?:tax\s+refund|refund\s+of|reimbursement|overpayment|unclaimed\s+funds?)\b",
        r"\brefund\s+(?:of\s+)?[$€£]\s*[\d,]+",
    ),
    _r(
        "financial_lottery", "financial", Severity.HIGH,
        "The message claims an unexpected prize or inheritance.",
        r"\b(?:lottery|jackpot|you\s+(?:have\s+)?won|prize\s+(?:money|winner)|"
        r"inheritance|beneficiary|windfall|you\s+are\s+a\s+winner)\b",
        r"\bcongrat\w*,\s*you\b",
    ),

    # ── Suspicious instructions ────────────────────────────────────────
    _r(
        "instruct_click", "instructions", Severity.MEDIUM,
        "The message tells you to click a link rather than use an official app or site.",
        r"\b(?:click|tap|press)\s+(?:on\s+|the\s+)?(?:link\s+|button\s+|icon\s+)?(?:below|here|now|this\s+link)\b",
        r"\bverify\s+here\b",
        r"\bfollow\s+this\s+link\b",
    ),
    _r(
        "instruct_attachment", "instructions", Severity.HIGH,
        "The message asks you to open or run an attached file, a common malware vector.",
        r"\b(?:open|download|run|execute|install)\s+(?:the\s+)?"
        r"(?:attached|attachment|file|document|invoice|statement|form|zip|exe)\b",
        r"\bsee\s+the\s+attached\b",
    ),
    _r(
        "instruct_security_disable", "instructions", Severity.CRITICAL,
        "The message asks you to weaken your own security software.",
        r"\benable\s+(?:the\s+)?macros?\b",
        r"\bdisable\s+(?:your\s+)?(?:antivirus|firewall|security\s+(?:software|software|feature))\b",
        r"\bturn\s+off\s+(?:your\s+)?(?:antivirus|firewall)\b",
    ),

    # ── Impersonation ──────────────────────────────────────────────────
    _r(
        "impersonation_official", "impersonation", Severity.MEDIUM,
        "The message presents itself as an official support channel.",
        r"\b(?:official|certified|authori[sz]ed|verified|trusted)\s+"
        r"(?:support|service|team|department|notice|helpdesk)\b",
        r"\b(?:customer\s+(?:support|service|care|desk)|support\s+(?:team|agent|desk))\b",
        r"\b(?:this\s+is|we\s+are)\s+(?:the\s+)?(?:official|support|security|team)\b",
    ),
    _r(
        "impersonation_no_reply", "impersonation", Severity.MEDIUM,
        "The sender address is a no-reply style address that cannot be answered.",
        r"\bno[\s_-]?reply[\s_-]?(?:@|\b)",
        r"\bdo[\s_-]?not[\s_-]?reply\b",
        r"\b(?:notifications?|alerts?|automated)\s*@\b",
    ),
    _r(
        "impersonation_authority", "impersonation", Severity.MEDIUM,
        "The message claims authority over you in order to demand compliance.",
        r"\bas\s+(?:an?\s+)?(?:administrator|admin|security\s+team|it\s+(?:department|support)|"
        r"your\s+(?:bank|company|employer))\b",
        r"\bon\s+behalf\s+of\s+(?:the\s+)?(?:management|company|bank|authorities)\b",
    ),

    # ── Social engineering ─────────────────────────────────────────────
    _r(
        "social_pretext", "social_engineering", Severity.MEDIUM,
        "The message uses a familiar pretext, such as a failed delivery, to prompt action.",
        r"\b(?:undeliverable|failed\s+(?:to\s+)?deliver\w*|could\s+not\s+be\s+delivered)\b",
        r"\bout\s+for\s+delivery\b",
        r"\b(?:package|parcel|shipment|delivery|order|consignment)\s+"
        r"(?:is\s+|are\s+|has\s+been\s+)?(?:on\s+hold|held|waiting|available|delayed|pending)\b",
        r"\byour\s+parcel\b",
        r"\b(?:redelivery|re-?delivery)\s+(?:fee|cost|charge)\b",
    ),
    _r(
        "social_curiosity", "social_engineering", Severity.LOW,
        "The message references a recent activity of yours to seem personally relevant.",
        r"\b(?:did\s+you|have\s+you|we\s+noticed)\b[^.!?]{0,60}?"
        r"\b(?:purchase[ds]?|receive[ds]?|order(?:ed)?|transfer(?:red)?|withdraw)\b",
        r"\byour\s+(?:recent|last)\s+(?:purchase|payment|order|transaction|activity)\b",
    ),
    _r(
        "social_confidential", "social_engineering", Severity.MEDIUM,
        "The message asks you to keep it secret, isolating you from others who might warn you.",
        r"\bkeep\s+this\s+(?:confidential|private|between\s+us|a\s+secret)\b",
        r"\b(?:do\s+not|don'?t)\s+(?:tell|inform|share\s+with|alert)\s+(?:anyone|anybody|your)\b",
    ),
    _r(
        "social_reward", "social_engineering", Severity.MEDIUM,
        "The message offers an incentive to lower your guard.",
        r"\byou\s+(?:have\s+been\s+)?(?:selected|eligible|chosen|qualified)\b",
        r"\bact\s+(?:now|fast)\s+to\s+(?:claim|receive|get)\b",
        r"\bclaim\s+your\s+(?:reward|prize|gift|bonus|voucher)\b",
    ),
)

_CATEGORY_INDEX: dict[str, str] = {rule.key: rule.category for rule in RULES}


def category_of(key: str) -> str:
    """Return the requirement category a rule key belongs to."""
    return _CATEGORY_INDEX.get(key, "other")