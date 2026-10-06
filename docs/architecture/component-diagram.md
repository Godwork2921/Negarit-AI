# Component Diagram

## Backend (FastAPI) — `backend/api/`

```mermaid
flowchart TB
    subgraph api["app/api"]
        V1["v1/router.py<br/><i>mounts all v1 routers</i>"]
        AUTH_R["v1/auth.py"]
        ANA_R["v1/analysis.py"]
        HIST_R["v1/history.py"]
        HLTH_R["v1/health.py"]
    end

    subgraph core["Application core"]
        SVC["services/analysis_service.py<br/><i>orchestration</i>"]
        ANA_SVC["services/auth_service.py"]
        AGG["services/stats_service.py"]
    end

    subgraph sec["Security"]
        JWT["security/authentication.py"]
        PWD["security/password.py"]
        RL["security/rate_limit.py"]
        DEPS["security/dependencies.py"]
    end

    subgraph val["Validation & errors"]
        SCH["schemas/*.py<br/><i>Pydantic DTOs</i>"]
        FILES["utils/file_utils.py"]
        EXC["exceptions/handlers.py"]
    end

    subgraph persist["Persistence"]
        REPO["database/repositories/*"]
        BASE["database/base.py"]
        MIG["database/migrations/*<br/><i>Alembic</i>"]
    end

    subgraph ai["ai/ — separate package"]
        PH["phishing_detection"]
        UD["url_detection"]
        OCR["ocr"]
        DF["deepfake_detection"]
        RE["risk_engine"]
    end

    subgraph ti["Integrations"]
        TIF["threat_intelligence.py<br/><i>provider interface</i>"]
        VTP["virustotal.py"]
        IPP["ipinfo.py"]
        WIP["whois.py"]
        NULL["null_provider.py"]
    end

    V1 --> AUTH_R & ANA_R & HIST_R & HLTH_R
    ANA_R --> DEPS & SVC
    AUTH_R --> ANA_SVC
    ANA_SVC --> PWD & JWT
    ANA_SVC --> REPO
    HIST_R --> REPO
    ANA_R --> AGG

    DEPS --> JWT & RL
    ANA_R --> SCH & FILES
    SVC --> PH & UD & OCR & DF & RE
    SVC --> TIF
    TIF --> VTP & IPP & WIP & NULL

    REPO --> BASE
    BASE --> MIG
    SVC -.raises.-> EXC
```

### Layer responsibilities

| Layer | May depend on | Must never |
|---|---|---|
| `api/v1/*` | schemas, services, security | import `ai/` directly, build SQL, touch the ORM |
| `services/*` | `ai/`, repositories, integrations | know about HTTP or Pydantic request objects |
| `ai/*` | nothing outside `ai/` | import the API, ORM, or perform I/O |
| `integrations/*` | `httpx` only | be imported by `ai/` (the engine receives results, not clients) |
| `database/repositories/*` | ORM, models | contain business rules |
| `models/*` | SQLAlchemy | be returned from a route — DTOs only |

### Endpoints by router

| Router | Path prefix | Routes |
|---|---|---|
| `auth` | `/auth` | register · login · refresh · me |
| `analysis` | `/analysis` | message · image · url · `{id}` |
| `history` | `/history`, `/stats` | list · summary |
| `health` | `/health` | live · ready |

## AI engine — `ai/`

```mermaid
flowchart LR
    subgraph shared["shared/"]
        IND["Indicator"]
        RES["DetectorResult"]
        CONF["Severity enum"]
    end

    subgraph detectors["Detectors — independent, composable"]
        A["phishing_detection<br/>analyse(text)"]
        B["url_detection<br/>analyse(url)"]
        C["ocr<br/>extract(image)"]
        D["deepfake_detection<br/>analyse(image)"]
    end

    subgraph agg["Aggregation"]
        E["risk_engine/scoring.py"]
        F["risk_engine/rules.py"]
        G["risk_engine/thresholds.py"]
        H["risk_engine/explanation.py"]
    end

    P["model_registry/registry.py<br/><i>version + provenance</i>"]
    EV["evaluation/evaluation.py<br/><i>metrics, confusion matrix</i>"]

    A & B & C & D --> IND
    IND --> RES
    RES --> E
    F & G --> E
    E --> H
    P -.provenance.-> A & B & C & D
    EV -.scores.-> A & B
```

- Each detector is a **pure function** with one public entry point.
- All detectors emit `Indicator` objects, so `risk_engine` can score any mix
  of sources without knowing which produced them.
- `model_registry` records which model or feature-set produced each signal —
  the basis for the honesty guarantees in §30.
- `evaluation/` measures detectors against labelled datasets. A detector with
  no evaluation report is treated as unvalidated.

## Frontend — `frontend/`

Existing Next.js 16 App Router application; retained.

```mermaid
flowchart TB
    PAGES["app/*<br/><i>routes</i>"]
    COMP["components/*<br/><i>UI</i>"]
    CTX["contexts/*<br/><i>theme · i18n</i>"]
    LIB["lib/api.js<br/><i>fetch wrapper</i>"]
    CONS["lib/constants.ts<br/><i>thresholds mirror</i>"]
    VAL["lib/validation.ts"]

    PAGES --> COMP
    PAGES --> CTX
    PAGES --> LIB
    PAGES --> VAL
    LIB --> CONS
```

`lib/constants.ts` currently mirrors the risk thresholds client-side. Once
`RISK_*` values are served from the API the frontend should read them from
the response instead of hard-coding, so there is a single source of truth.
Tracked as a follow-up.