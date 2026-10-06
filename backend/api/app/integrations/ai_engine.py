"""The one place the API service talks to the detection engine.

Everything the backend knows about the ``ai`` package is confined to this
module. That buys three things:

- The HTTP layer never imports detection code, so a change to the engine's
  internal API cannot ripple into routers and schemas.
- Engine types are converted to plain dataclasses and dicts at this boundary,
  which keeps Pydantic from depending on the engine's internals.
- The ``sys.path`` bootstrap needed by the current repository layout lives in
  exactly one file, instead of every module that imports the engine.

The engine is deterministic and performs no network I/O. A submitted URL is
parsed, never fetched.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any

from app.exceptions import AnalysisFailed

__all__ = [
    "RiskLevel",
    "SignalDetail",
    "AnalysisOutcome",
    "analyse_message",
    "analyse_url",
    "engine_info",
    "EngineUnavailable",
]


class EngineUnavailable(RuntimeError):
    """The detection engine could not be imported or configured."""


def _resolve_engine_path() -> Path:
    """Locate the ``ai`` directory that holds the detection engine.

    The engine installs as top-level packages (``shared``, ``risk_engine``,
    ...) because the repository layout fixes the directory names. This makes
    the backend work whether or not it has been ``pip install``-ed.
    """
    candidates = [
        Path(__file__).resolve().parents[4] / "ai",   # <repo>/backend/api/app/integrations -> <repo>/ai
        Path(__file__).resolve().parents[3] / "ai",
        Path.cwd() / "ai",
        Path.cwd() / ".." / "ai",
    ]
    for candidate in candidates:
        if (candidate / "risk_engine" / "__init__.py").is_file():
            return candidate.resolve()
    raise EngineUnavailable(
        "Could not locate the detection engine. Expected an 'ai' directory "
        "containing risk_engine/, or install the package with "
        "`pip install -e ai/`."
    )


def _load_engine() -> dict[str, Any]:
    """Import the engine modules once and memoise them."""
    global _ENGINE
    if _ENGINE is not None:
        return _ENGINE

    engine_root = _resolve_engine_path()
    if str(engine_root) not in sys.path:
        sys.path.insert(0, str(engine_root))

    try:
        from phishing_detection import analyse as analyse_message_fn
        from risk_engine import (
            RiskConfig,
            assess,
            build_explanation,
            recommend_actions,
        )
        from risk_engine import load_risk_config
        from shared.extractors import extract_emails, extract_urls
        from shared.types import SignalFamily, SignalScore
        from url_detection import analyse as analyse_url_fn
    except Exception as exc:  # pragma: no cover - import failure path
        raise EngineUnavailable(f"Failed to import the detection engine: {exc}") from exc

    _ENGINE = {
        "root": engine_root,
        "analyse_message": analyse_message_fn,
        "analyse_url": analyse_url_fn,
        "extract_urls": extract_urls,
        "extract_emails": extract_emails,
        "assess": assess,
        "build_explanation": build_explanation,
        "recommend_actions": recommend_actions,
        "load_risk_config": load_risk_config,
        "RiskConfig": RiskConfig,
        "SignalFamily": SignalFamily,
        "SignalScore": SignalScore,
    }
    return _ENGINE


_ENGINE: dict[str, Any] | None = None


# ── Engine-independent response types ──────────────────────────────────


class RiskLevel(str, Enum):
    """Verdict bands, mirrored so the API does not import engine enums."""

    SAFE = "SAFE"
    SUSPICIOUS = "SUSPICIOUS"
    DANGEROUS = "DANGEROUS"


@dataclass(frozen=True, slots=True)
class SignalDetail:
    """One signal family's contribution to the score."""

    family: str
    score: float
    available: bool
    simulated: bool
    reason: str | None = None


@dataclass(frozen=True, slots=True)
class AnalysisOutcome:
    """Engine result in a transport-friendly shape.

    Attributes:
        score: 0-100 aggregate risk.
        level: Verdict band.
        explanation: Plain-language summary of the verdict and its basis.
        indicators: Findings that drove the score.
        signals: Per-family contribution, including unavailable ones.
        actions: Ordered recommended actions.
        strongest_family: Which signal carried the most weight.
        corroborating_families: Families that independently agreed.
        unavailable_families: Checks that could not run, listed rather than
            silently scored as zero.
        has_critical: Whether a conclusive finding fired.
        simulated: Whether any contributing signal was heuristic rather than
            backed by a real source.
        detected_urls: Links found in the submitted content.
        detected_emails: Addresses found in the submitted content.
        timings_ms: Per-stage durations.
    """

    score: int
    level: RiskLevel
    explanation: str
    indicators: tuple[dict[str, Any], ...]
    signals: tuple[SignalDetail, ...]
    actions: tuple[str, ...]
    strongest_family: str | None
    corroborating_families: tuple[str, ...]
    unavailable_families: tuple[str, ...]
    has_critical: bool
    simulated: bool
    detected_urls: tuple[str, ...] = ()
    detected_emails: tuple[str, ...] = ()
    engine_version: str = ""
    timings_ms: dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "risk_score": self.score,
            "risk_level": self.level.value,
            "explanation": self.explanation,
            "has_critical_indicator": self.has_critical,
            "strongest_signal": self.strongest_family,
            "corroborating_signals": list(self.corroborating_families),
            "unavailable_signals": list(self.unavailable_families),
            "is_simulated": self.simulated,
            "indicators": [dict(item) for item in self.indicators],
            "signals": [
                {
                    "family": signal.family,
                    "score": signal.score,
                    "available": signal.available,
                    "simulated": signal.simulated,
                    "reason": signal.reason,
                }
                for signal in self.signals
            ],
            "recommended_actions": list(self.actions),
            "detected_urls": list(self.detected_urls),
            "detected_emails": list(self.detected_emails),
            "engine_version": self.engine_version,
            "timings_ms": dict(self.timings_ms),
        }


def _engine_version(engine: dict[str, Any]) -> str:
    """Best-effort version string for the engine in use."""
    root = engine["root"]
    pyproject = root / "pyproject.toml"
    if pyproject.is_file():
        for line in pyproject.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if stripped.startswith("version"):
                return stripped.split("=", 1)[1].strip().strip('"')
    return "unknown"


def _to_outcome(
    engine: dict[str, Any],
    results: list[Any],
    risk_env: dict[str, str],
    *,
    urls: tuple[str, ...] = (),
    emails: tuple[str, ...] = (),
    timings_ms: dict[str, float] | None = None,
) -> AnalysisOutcome:
    """Combine detector results into an :class:`AnalysisOutcome`."""
    signal_family = engine["SignalFamily"]
    signal_score = engine["SignalScore"]

    # Families with no detector are reported as unavailable rather than zero.
    # A missing check must never read as a passed check.
    extra = {
        signal_family.THREAT_INTEL: signal_score.unavailable(
            signal_family.THREAT_INTEL,
            "threat intelligence is disabled for this deployment",
        )
    }
    families_run = {result.family for result in results}
    if signal_family.SENDER not in families_run:
        extra[signal_family.SENDER] = signal_score.unavailable(
            signal_family.SENDER, "no sender headers were submitted"
        )

    config = engine["load_risk_config"](risk_env)
    assessment = engine["assess"](results, extra_signals=extra, config=config)

    indicators = tuple(
        indicator.to_dict()
        for indicator in sorted(
            assessment.indicators,
            key=lambda i: (-i.effective_weight, i.type),
        )
    )

    return AnalysisOutcome(
        score=assessment.score,
        level=RiskLevel(assessment.level.value),
        explanation=engine["build_explanation"](assessment),
        indicators=indicators,
        signals=tuple(
            SignalDetail(
                family=family.value,
                score=round(signal.score, 4),
                available=signal.available,
                simulated=signal.simulated,
                reason=signal.reason,
            )
            for family, signal in assessment.signals.items()
        ),
        actions=tuple(engine["recommend_actions"](assessment)),
        strongest_family=(
            assessment.strongest_family.value if assessment.strongest_family else None
        ),
        corroborating_families=tuple(f.value for f in assessment.corroborating_families),
        unavailable_families=tuple(f.value for f in assessment.unavailable_families),
        has_critical=assessment.has_critical,
        simulated=assessment.is_simulated,
        detected_urls=urls,
        detected_emails=emails,
        engine_version=_engine_version(engine),
        timings_ms=timings_ms or {},
    )


def _require_text(value: str | None, field_name: str, *, limit: int = 20000) -> str:
    """Validate a submitted string before it reaches the engine."""
    if value is None:
        raise AnalysisFailed(f"{field_name} is required.")
    text = value.strip()
    if not text:
        raise AnalysisFailed(f"{field_name} must not be empty.")
    if len(text) > limit:
        raise AnalysisFailed(
            f"{field_name} is too long. The limit is {limit} characters."
        )
    return text


def analyse_message(
    text: str,
    *,
    sender_email: str | None = None,
    risk_env: dict[str, str] | None = None,
) -> AnalysisOutcome:
    """Analyse submitted message text.

    Runs the phishing detector over the text and the URL detector over every
    link found inside it, so a scam whose only real signal is its link is still
    caught.

    Raises:
        AnalysisFailed: The input is empty or over the length limit.
    """
    import time

    engine = _load_engine()
    body = _require_text(text, "message")
    sender = sender_email.strip() if sender_email and sender_email.strip() else None

    timings: dict[str, float] = {}

    started = time.perf_counter()
    urls = tuple(engine["extract_urls"](body))
    emails = tuple(engine["extract_emails"](body))
    timings["extraction"] = round((time.perf_counter() - started) * 1000, 2)

    started = time.perf_counter()
    message_result = engine["analyse_message"](body, sender_email=sender)
    timings["phishing"] = round((time.perf_counter() - started) * 1000, 2)

    started = time.perf_counter()
    url_results = [engine["analyse_url"](url) for url in urls]
    timings["url"] = round((time.perf_counter() - started) * 1000, 2)

    return _to_outcome(
        engine,
        [message_result, *url_results],
        risk_env or {},
        urls=urls,
        emails=emails,
        timings_ms=timings,
    )


def analyse_url(
    url: str,
    *,
    risk_env: dict[str, str] | None = None,
) -> AnalysisOutcome:
    """Analyse a single submitted URL. It is parsed, never fetched."""
    import time

    engine = _load_engine()
    candidate = _require_text(url, "url", limit=2048)

    started = time.perf_counter()
    result = engine["analyse_url"](candidate)
    timings = {"url": round((time.perf_counter() - started) * 1000, 2)}

    return _to_outcome(
        engine,
        [result],
        risk_env or {},
        urls=(candidate,),
        timings_ms=timings,
    )


def engine_info() -> dict[str, Any]:
    """Describe the engine actually loaded, for the health endpoint."""
    engine = _load_engine()
    return {
        "loaded": True,
        "path": str(engine["root"]),
        "version": _engine_version(engine),
        "modules": ["shared", "phishing_detection", "url_detection", "risk_engine"],
        "modules_pending": ["ocr", "deepfake_detection"],
        "network_access": False,
    }