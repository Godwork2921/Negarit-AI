# Negarit AI — Detection Engine (`ai/`)

This package holds every detection capability in the platform. It is
**independent of the backend API and the database** — it accepts plain
Python inputs and returns structured results. The API layer calls it;
it never imports from it.

## Why this package exists

The previous implementation sent every analysis to a single LLM prompt and
trusted the reply. That is unreliable for security decisions: the score is
not reproducible, cannot be calibrated, cannot be unit-tested, and it
disappears when the API key is missing.

Per requirement §35, each problem gets the approach that actually fits it:

| Problem | Approach | Module |
|---|---|---|
| Phishing text | Lexical/linguistic feature extraction + calibrated classifier + rules | `phishing_detection/` |
| Suspicious URL | Lexical features + domain reputation + threat intelligence | `url_detection/` |
| Deepfake / manipulation | Computer-vision model behind an abstraction | `deepfake_detection/` |
| Screenshot text | OCR engine (Tesseract) + preprocessing | `ocr/` |
| Final judgement | Deterministic weighted scoring + explanation | `risk_engine/` |

An LLM may be used to *phrase* an explanation. It is never a detection
signal.

## Modules

```
ai/
├── phishing_detection/   Text → indicators + classification + confidence   [implemented]
├── url_detection/        URL  → lexical features + reputation indicators  [implemented]
├── risk_engine/          All signals → 0-100 score + band + reasons + actions [implemented]
├── shared/               Types and extractors shared across modules       [implemented]
├── deepfake_detection/   Image → likely_authentic | likely_manipulated | ai_generated | uncertain
├── ocr/                  Image → extracted_text + detected_urls + detected_entities
├── evaluation/           Metrics, confusion matrices, calibration reports
└── model_registry/       Versioned metadata for every model/feature-set in use
```

Modules marked *not implemented* have no code yet. Nothing imports them, and no
caller expects a result from them.

## Shared contract

Every detector returns a **list of indicators**, never a bare number. An
indicator is the unit of explainability — the risk engine scores them, and
the UI renders them.

```python
@dataclass(frozen=True)
class Indicator:
    type: str            # e.g. "urgency", "credential_request"
    severity: str        # "info" | "low" | "medium" | "high" | "critical"
    description: str     # human-readable, shown verbatim in the UI
    weight: float        # contribution toward the aggregate score
    evidence: str | None # the matched span, for auditability
    simulated: bool      # True when produced without a real model
```

`simulated` is what lets requirement §30 hold: any signal not backed by a
real model or real reputation data is labelled honestly in the UI instead of
being presented as inference.

## Running the engine

The implemented engine depends only on the standard library, so it needs no
network access and no API keys.

```bash
cd ai
python -m pytest            # 140 tests
```

```python
from phishing_detection import analyse as analyse_message
from url_detection import analyse as analyse_url
from risk_engine import assess, build_explanation
from shared.extractors import extract_urls

message = (
    "URGENT: Your account will be suspended in 2 hours. "
    "Verify your identity immediately: "
    "https://secure-login.paypal.com.evil.tk/auth"
)

results = [analyse_message(message)]
results += [analyse_url(url) for url in extract_urls(message)]

assessment = assess(results)
print(assessment.score, assessment.level.value)   # 93 DANGEROUS
print(build_explanation(assessment))
```

To install it as a package instead of running from this directory:

```bash
pip install -e ".[dev]"
```

Note that these install as **top-level** module names (`shared`, `risk_engine`,
`phishing_detection`, `url_detection`) because the directory layout is fixed by
the project structure. `shared` in particular is a generic name that could
collide with another distribution in a shared environment. If that becomes a
problem, the fix is to give them a common namespace prefix at the packaging
layer; the source layout itself does not need to change.

## Scoring model

1. **Strongest signal wins.** The score starts from the worst single family, so
   one decisive finding is never averaged away by quiet families.
2. **Bounded corroboration.** Independent agreeing families push the score
   toward 100 with diminishing returns. The gain is bounded by 1, so
   corroboration can refine a verdict but never manufacture one.
3. **Critical floor.** A conclusive finding — a confirmed brand typosquat, a
   request for credentials — sets a minimum score, so severity is never
   understated by a single partial signal.

Two properties are enforced by the test suite:

- A signal that could not be evaluated is reported as **unavailable**, never as
  a zero. An input no detector could parse is reported as *not judged safe*,
  not as clean.
- **Nothing ever subtracts.** Absence of a reputation hit is not evidence of
  safety.

Bands are configuration, read from the environment (`RISK_SAFE_MAX`,
`RISK_SUSPICIOUS_MAX`, `RISK_WEIGHT_*`, `RISK_AGREEMENT_THRESHOLD`,
`RISK_CORROBORATION_STRENGTH`, `RISK_CRITICAL_BONUS`) via
`risk_engine.load_risk_config()`. Out-of-range values fall back to the
documented defaults rather than taking the service down.

## Ground rules

- **Offline by default.** With `AI_OFFLINE_MODE=true` the engine performs no
  network calls and still returns a full analysis. Submitted URLs are parsed,
  never fetched.
- **Deterministic.** Same input ⇒ same output. No hidden randomness.
- **No I/O outside the module.** Not the database, not HTTP, not the API layer.
- **Typed.** Full type hints; public functions have docstrings.
- **Every threshold comes from configuration**, never a literal in logic.

## Status

Implemented modules are listed in [`docs/architecture/system-architecture.md`](../docs/architecture/system-architecture.md).
Any module without a real model states so plainly in its own README and
returns `uncertain` rather than guessing.

Detection quality is currently judged against the small fixture sets in
`ai/tests/`. Those fixtures are illustrative, not a benchmark: the thresholds
are marked provisional until a labelled dataset and a calibration report exist
in `ai/evaluation/`.