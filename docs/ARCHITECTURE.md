# MatchDay Command — System Architecture

> **Version**: 1.0.0 | **Last Updated**: 2026-07-07 | **Status**: Production-Ready

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Component Descriptions](#2-component-descriptions)
3. [Data Flow](#3-data-flow)
4. [Graceful Degradation Matrix](#4-graceful-degradation-matrix)
5. [Firestore Data Model](#5-firestore-data-model)
6. [AI Layer](#6-ai-layer)
7. [Real-time Architecture](#7-real-time-architecture)
8. [Scalability](#8-scalability)
9. [Security](#9-security)
10. [Monitoring](#10-monitoring)

---

## 1. System Overview

MatchDay Command is a unified, cloud-native platform that enables AI-powered stadium operations and real-time fan guidance for the FIFA World Cup 2026. The platform is designed to handle 80,000+ concurrent fans per venue across multiple stadiums simultaneously.

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT TIER                                    │
│                                                                         │
│   ┌─────────────────────┐          ┌──────────────────────────┐        │
│   │     Fan PWA          │          │    Ops Dashboard          │        │
│   │  (React + Vite)      │          │   (React + Vite)          │        │
│   │                      │          │                            │        │
│   │  • Route map         │          │  • Incident board          │        │
│   │  • Live alerts       │          │  • Heatmap viewer          │        │
│   │  • i18n (8 langs)    │          │  • Reroute controls        │        │
│   │  • PWA offline       │          │  • AI triage panel         │        │
│   │  • A11y WCAG 2.1 AA  │          │  • Dark mode UI            │        │
│   └──────────┬───────────┘          └────────────┬─────────────┘        │
│              │ HTTPS / SSE                        │ HTTPS / SSE          │
└──────────────┼────────────────────────────────────┼─────────────────────┘
               │                                    │
               ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY / CDN                               │
│                    (Cloud Run Ingress + Cloud CDN)                      │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      BACKEND TIER (FastAPI)                             │
│                     Cloud Run — up to 1000 instances                   │
│                                                                         │
│  POST /api/route          GET  /api/heatmap                            │
│  POST /api/incidents      GET  /api/incidents                          │
│  POST /api/incidents/{id}/triage                                       │
│  POST /api/predict-bottleneck                                          │
│  POST /api/reroute-broadcast                                           │
│  GET  /api/sse/reroute    GET  /api/health                             │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────────────┐ │
│  │  Route   │  │ Incident │  │  Predict  │  │   SSE Broadcast      │ │
│  │  Router  │  │  Router  │  │  Router   │  │      Router          │ │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └──────────┬───────────┘ │
│       │              │              │                     │             │
└───────┼──────────────┼──────────────┼─────────────────────┼────────────┘
        │              │              │                     │
        ▼              ▼              ▼                     ▼
┌───────────┐  ┌──────────────┐  ┌───────────────┐  ┌───────────────┐
│  Google   │  │  Firestore   │  │  Vertex AI    │  │  Firestore    │
│  Maps API │  │  (Database)  │  │  Gemini Pro   │  │  (Real-time   │
│           │  │              │  │               │  │   Listeners)  │
│ Directions│  │ incidents    │  │ • Triage       │  │               │
│ Distance  │  │ routes       │  │ • Predict      │  │ SSE fan_ids   │
│ Geocoding │  │ broadcasts   │  │ • Broadcast    │  │ connections   │
└───────────┘  │ heatmap_snap │  └───────────────┘  └───────────────┘
               │ stadium_cfg  │
               │ user_sessions│
               └──────────────┘
```

### Technology Summary

| Layer        | Technology                       | Purpose                             |
|--------------|----------------------------------|-------------------------------------|
| Fan Frontend | React 18 + Vite + TypeScript     | Progressive Web App, i18n, offline  |
| Ops Frontend | React 18 + Vite + TypeScript     | Operations dashboard, dark mode     |
| Backend API  | FastAPI 0.111 + Python 3.11      | REST + SSE endpoints, business logic|
| AI Engine    | Vertex AI Gemini 1.5 Pro         | Triage, prediction, broadcast text  |
| Database     | Cloud Firestore                  | Real-time NoSQL document store      |
| Maps         | Google Maps Platform             | Route calculation, geocoding        |
| Hosting      | Cloud Run (GCP)                  | Auto-scaling container hosting      |
| CDN / TLS    | Cloud CDN + Cloud Load Balancing | Global edge, HTTPS termination      |
| CI/CD        | GitHub Actions                   | Automated test + deploy pipeline    |

---

## 2. Component Descriptions

### 2.1 Backend — FastAPI Application

The backend is a single FastAPI application organized into domain routers. It is deployed as a Docker container on Cloud Run.

**Entry Point**: `backend/app/main.py`

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, router registration
│   ├── routers/
│   │   ├── route.py         # POST /api/route
│   │   ├── incidents.py     # GET/POST /api/incidents, POST /api/incidents/{id}/triage
│   │   ├── heatmap.py       # GET /api/heatmap
│   │   ├── predict.py       # POST /api/predict-bottleneck
│   │   ├── broadcast.py     # POST /api/reroute-broadcast
│   │   ├── sse.py           # GET /api/sse/reroute
│   │   └── health.py        # GET /api/health
│   ├── services/
│   │   ├── firestore_service.py   # Firestore CRUD + listeners
│   │   ├── maps_service.py        # Google Maps API calls
│   │   ├── gemini_service.py      # Vertex AI Gemini integration
│   │   └── sse_manager.py         # In-memory SSE connection registry
│   └── models/
│       ├── route.py
│       ├── incident.py
│       └── broadcast.py
├── tests/
│   ├── test_route.py
│   ├── test_incidents.py
│   ├── test_heatmap.py
│   ├── test_predict.py
│   ├── test_broadcast.py
│   └── test_sse.py
├── Dockerfile
├── requirements.txt
└── .dockerignore
```

**8 Endpoints Summary**:

| # | Method | Path                                | Function                       |
|---|--------|-------------------------------------|--------------------------------|
| 1 | POST   | `/api/route`                        | Calculate optimal walking route|
| 2 | GET    | `/api/heatmap`                      | Return crowd density grid      |
| 3 | GET    | `/api/incidents`                    | List active incidents          |
| 4 | POST   | `/api/incidents`                    | Create new incident            |
| 5 | POST   | `/api/incidents/{id}/triage`        | AI-powered incident triage     |
| 6 | POST   | `/api/predict-bottleneck`           | Predict crowd bottlenecks      |
| 7 | POST   | `/api/reroute-broadcast`            | Broadcast reroute message      |
| 8 | GET    | `/api/sse/reroute`                  | SSE stream for live alerts     |

**SSE Architecture**: The backend maintains an in-memory dictionary mapping `stadium_id` → `List[asyncio.Queue]`. When a broadcast is posted, it enqueues a message into all registered queues for that stadium, which are drained by the SSE generator functions for each connected fan client.

### 2.2 Fan PWA — Progressive Web App

The Fan PWA is a mobile-first React application targeted at the 80,000+ fans inside each venue. It is internationalized into 8 languages and fully functional offline via service workers.

**7 Core Components**:

| Component             | Responsibility                                          |
|-----------------------|---------------------------------------------------------|
| `RouteMap`            | Interactive map with walking path overlay (Leaflet.js) |
| `AlertBanner`         | Sticky top banner showing live reroute alerts           |
| `IncidentFeed`        | Auto-refreshing list of nearby incidents                |
| `HeatmapOverlay`      | Color-coded crowd density layer over the stadium map    |
| `LanguageSwitcher`    | Dropdown to change i18n locale (8 langs, RTL support)  |
| `OfflineIndicator`    | Visible badge when offline; replays cached SSE          |
| `ShareRoute`          | Web Share API button to send route to companions        |

**i18n Strategy**: `react-i18next` with locale files for en, es, fr, ar, pt, de, ja, zh. RTL layout is toggled via `dir="rtl"` on `<html>` for Arabic. All strings are externalized — no hardcoded UI text.

**PWA Features**:
- `vite-plugin-pwa` with Workbox for service worker generation
- Pre-caches static assets (JS, CSS, map tiles)
- Background sync for incident reports submitted while offline
- Web App Manifest for "Add to Home Screen" on iOS/Android
- Push notification support via FCM (opt-in)

**Accessibility**: WCAG 2.1 AA compliant. All interactive elements have ARIA labels, focus rings, and color contrast ratios ≥ 4.5:1.

### 2.3 Ops Dashboard — Operations Center

The Ops Dashboard is a desktop-first React application used by stadium operations staff. It is designed for high-density information display with a premium dark-mode UI.

**7 Core Components**:

| Component              | Responsibility                                           |
|------------------------|----------------------------------------------------------|
| `IncidentBoard`        | Kanban-style columns: Open / Triaged / Resolved          |
| `HeatmapViewer`        | Full-stadium heatmap with zone labels and density scale  |
| `ReroutePanel`         | Form to compose and broadcast reroute messages           |
| `BottleneckPredictor`  | AI prediction form + result display with confidence %    |
| `SSEMonitor`           | Live feed of connected fan SSE clients per stadium       |
| `MetricsDashboard`     | Real-time KPIs: active incidents, density alerts, SLA    |
| `ThemeToggle`          | Light/dark mode toggle (persisted to localStorage)       |

**Dark Mode**: CSS custom properties (`--color-bg`, `--color-surface`, etc.) switched via a `data-theme="dark"` attribute on `<html>`. Entire theme uses no hard-coded color values in components.

---

## 3. Data Flow

### 3.1 Route Calculation

```
Fan (PWA)                  Backend                     Google Maps API
   │                          │                               │
   │  POST /api/route         │                               │
   │  { from, to, stadium }   │                               │
   │─────────────────────────►│                               │
   │                          │  directions API request       │
   │                          │──────────────────────────────►│
   │                          │  polyline + duration          │
   │                          │◄──────────────────────────────│
   │                          │                               │
   │                          │  fetch heatmap zones         │
   │                          │──────► Firestore             │
   │                          │◄────── density data          │
   │                          │                               │
   │                          │  apply density penalty        │
   │                          │  re-rank route segments       │
   │                          │                               │
   │  { polyline, duration,   │                               │
   │    waypoints, warnings } │                               │
   │◄─────────────────────────│                               │
```

### 3.2 Incident Triage

```
Ops Staff (Dashboard)         Backend                   Vertex AI (Gemini)
      │                          │                               │
      │  POST /api/incidents     │                               │
      │  { type, location,       │                               │
      │    severity, description}│                               │
      │─────────────────────────►│                               │
      │                          │  write to Firestore          │
      │                          │──────► Firestore             │
      │                          │◄────── incident_id           │
      │  { incident_id, status } │                               │
      │◄─────────────────────────│                               │
      │                          │                               │
      │  POST /incidents/{id}/   │                               │
      │  triage                  │                               │
      │─────────────────────────►│                               │
      │                          │  construct triage prompt     │
      │                          │──────────────────────────────►│
      │                          │  { priority, actions,        │
      │                          │    estimated_resolution }    │
      │                          │◄──────────────────────────────│
      │                          │                               │
      │                          │  update Firestore            │
      │                          │──────► Firestore             │
      │  { triage_result }       │                               │
      │◄─────────────────────────│                               │
```

### 3.3 Bottleneck Prediction

```
Ops Staff (Dashboard)         Backend                   Vertex AI (Gemini)
      │                          │                               │
      │  POST /api/predict-      │                               │
      │  bottleneck              │                               │
      │  { stadium_id, zone,     │                               │
      │    time_horizon_min }    │                               │
      │─────────────────────────►│                               │
      │                          │  fetch current heatmap       │
      │                          │──────► Firestore             │
      │                          │◄────── density_grid          │
      │                          │                               │
      │                          │  fetch historical snapshots  │
      │                          │──────► Firestore             │
      │                          │◄────── heatmap_snapshots[]   │
      │                          │                               │
      │                          │  compose prediction prompt   │
      │                          │──────────────────────────────►│
      │                          │  { zones_at_risk, confidence,│
      │                          │    suggested_actions }       │
      │                          │◄──────────────────────────────│
      │  { prediction_result }   │                               │
      │◄─────────────────────────│                               │
```

### 3.4 Reroute Broadcast

```
Ops Staff (Dashboard)   Backend              Firestore         Fan PWA (SSE)
      │                    │                     │                    │
      │  POST /api/        │                     │                    │
      │  reroute-broadcast │                     │                    │
      │  { stadium_id,     │                     │                    │
      │    message,        │                     │                    │
      │    affected_zones} │                     │                    │
      │───────────────────►│                     │                    │
      │                    │  write broadcast    │                    │
      │                    │────────────────────►│                    │
      │                    │                     │                    │
      │                    │  enqueue SSE msg    │                    │
      │                    │  to all stadium     │                    │
      │                    │  connections        │                    │
      │                    │─────────────────────────────────────────►│
      │                    │                     │  event: reroute    │
      │                    │                     │  data: { message,  │
      │                    │                     │  zones, timestamp }│
      │  { broadcast_id,   │                     │                    │
      │    fan_count }     │                     │                    │
      │◄───────────────────│                     │                    │
```

---

## 4. Graceful Degradation Matrix

The system is designed to degrade gracefully when external services become unavailable. No external service outage should cause a complete system failure.

| Service Unavailable | Affected Endpoints                       | Degraded Behavior                                                                 | User Impact           |
|---------------------|------------------------------------------|-----------------------------------------------------------------------------------|-----------------------|
| **Gemini / Vertex AI** | `/api/incidents/{id}/triage`, `/api/predict-bottleneck`, `/api/reroute-broadcast` | Rule-based triage using severity + type keyword mapping. Static bottleneck alerts based on current heatmap thresholds. Pre-written broadcast templates. | Slightly less intelligent triage; no natural language in broadcasts |
| **Google Maps API** | `/api/route`                             | Return pre-calculated static routes from Firestore `routes` collection for common stadium entry/exit pairs. If no cached route exists, return nearest gate coordinates with walking distance estimate. | No live traffic-adjusted routes; users receive generic gate directions |
| **Firestore**       | All endpoints                            | In-memory mock data store activated (`USE_REAL_FIRESTORE=false`). SSE broadcast still functions via in-process queues. Heatmap returns last known snapshot from memory cache (TTL 5 min). | Potential data staleness; no cross-instance data sharing (single-instance mode) |
| **Cloud Run (partial)** | All                                 | Cloud Run health checks automatically route around unhealthy instances. Min-instances=1 ensures cold starts are avoided for critical paths. | Transparent to users; slight latency spike during scale events |
| **SSE Connection Lost** | `/api/sse/reroute`                  | Fan PWA implements exponential back-off reconnect (1s → 2s → 4s → 8s → max 30s). Alerts missed during disconnect are replayed from `broadcasts` collection on reconnect. | Brief alert gap; alerts fully recovered after reconnect |
| **Network Offline (Fan)** | All PWA features                   | Service worker serves cached app shell. Last known route from IndexedDB. Offline banner shown. Incident reports queued for background sync. | Full map visible; no live updates until connectivity restored |

---

## 5. Firestore Data Model

The Firestore database is organized into 6 top-level collections:

### 5.1 `incidents`

```
incidents/{incident_id}
├── id              : string        # Auto-generated Firestore doc ID
├── stadium_id      : string        # e.g., "levi-stadium-sf"
├── type            : string        # "medical" | "security" | "crowd" | "fire" | "technical"
├── severity        : string        # "low" | "medium" | "high" | "critical"
├── location        : map
│   ├── zone        : string        # e.g., "Gate A", "Section 112"
│   ├── lat         : number
│   └── lng         : number
├── description     : string        # Free-text description (sanitized, no PII)
├── status          : string        # "open" | "triaged" | "in_progress" | "resolved"
├── triage_result   : map | null
│   ├── priority    : string        # "P1" | "P2" | "P3" | "P4"
│   ├── recommended_actions : array<string>
│   ├── estimated_resolution_min : number
│   └── ai_model    : string        # "gemini-1.5-pro" | "rule-based"
├── reported_by     : string        # Staff ID (hashed, no PII)
├── created_at      : timestamp
├── updated_at      : timestamp
└── resolved_at     : timestamp | null
```

### 5.2 `broadcasts`

```
broadcasts/{broadcast_id}
├── id              : string
├── stadium_id      : string
├── message         : string        # Localized base message (en)
├── message_i18n    : map           # { es: "...", fr: "...", ar: "...", ... }
├── affected_zones  : array<string> # ["Gate A", "Section 100-110"]
├── severity        : string        # "info" | "warning" | "critical"
├── issued_by       : string        # Staff ID (hashed)
├── fan_reach_count : number        # How many SSE clients received it
├── created_at      : timestamp
└── expires_at      : timestamp     # Auto-cleared after match + 2h
```

### 5.3 `heatmap_snapshots`

```
heatmap_snapshots/{snapshot_id}
├── stadium_id      : string
├── captured_at     : timestamp
├── resolution      : string        # "50x50" grid cells
├── grid            : array<map>    # Array of { zone, row, col, density_pct, count }
│   └── zone        : string
│       density_pct : number        # 0.0 – 1.0
│       count       : number        # Estimated fan count in cell
│       risk_level  : string        # "low" | "medium" | "high" | "critical"
└── overall_density : number        # Stadium-wide average density
```

### 5.4 `routes`

```
routes/{route_id}
├── stadium_id      : string
├── from_label      : string        # e.g., "Parking Lot B"
├── to_label        : string        # e.g., "Gate C"
├── from_coords     : map { lat, lng }
├── to_coords       : map { lat, lng }
├── polyline        : string        # Encoded Google Maps polyline
├── distance_m      : number
├── duration_min    : number
├── waypoints       : array<map>    # [ { lat, lng, label } ]
├── is_accessible   : boolean       # ADA/mobility-accessible route
├── cached_at       : timestamp
└── expires_at      : timestamp     # 30-minute TTL then re-fetched
```

### 5.5 `stadium_config`

```
stadium_config/{stadium_id}
├── name            : string        # "Levi's Stadium"
├── city            : string        # "Santa Clara"
├── country         : string        # "USA"
├── capacity        : number        # 68,500
├── gates           : array<map>
│   └── id          : string
│       label       : string
│       lat         : number
│       lng         : number
│       is_accessible : boolean
├── zones           : array<string> # All defined zone names
├── heatmap_grid_rows : number      # e.g., 50
├── heatmap_grid_cols : number      # e.g., 50
├── match_schedule  : array<map>    # [ { match_id, kickoff_utc, teams } ]
└── ops_contact     : string        # Ops team contact (non-PII)
```

### 5.6 `user_sessions` (Ephemeral)

```
user_sessions/{session_token}
├── stadium_id      : string
├── language        : string        # User's selected locale
├── zone            : string | null # Last known zone (from QR scan)
├── notifications_enabled : boolean
├── created_at      : timestamp
└── expires_at      : timestamp     # TTL: 24 hours post match
```

> **Privacy Note**: No names, email addresses, phone numbers, or device identifiers are stored. Session tokens are cryptographically random UUIDs generated client-side.

---

## 6. AI Layer

### 6.1 Gemini Integration Overview

All AI calls use `vertexai.generative_models.GenerativeModel` via Application Default Credentials (ADC). The model used is `gemini-1.5-pro`. All prompts are structured to return JSON, validated via Pydantic before use.

### 6.2 Triage Prompt

**Trigger**: `POST /api/incidents/{id}/triage`

**Prompt Template**:
```
You are an expert stadium operations AI. Analyze the following incident and provide triage.

INCIDENT:
- Type: {incident.type}
- Severity: {incident.severity}
- Zone: {incident.location.zone}
- Description: {incident.description}
- Stadium Capacity: {stadium_config.capacity}
- Current Zone Density: {zone_density_pct}%
- Active Incidents in Zone: {active_incident_count}

Respond ONLY with valid JSON matching this schema:
{
  "priority": "P1|P2|P3|P4",
  "recommended_actions": ["action1", "action2", ...],
  "estimated_resolution_min": <integer>,
  "reasoning": "<one sentence>"
}

P1 = Life-threatening (immediate response).
P2 = High impact (response within 5 min).
P3 = Medium (15 min acceptable).
P4 = Low (can queue).
```

**Fallback Rules** (when Gemini unavailable):
- `critical` severity → P1
- `high` + `medical` or `fire` → P1
- `high` severity → P2
- `medium` severity → P3
- `low` severity → P4

### 6.3 Bottleneck Prediction Prompt

**Trigger**: `POST /api/predict-bottleneck`

**Prompt Template**:
```
You are a crowd flow prediction AI for a FIFA World Cup stadium.

CURRENT STATE:
- Stadium: {stadium_id} (capacity {capacity})
- Zones at high density (>70%): {high_density_zones}
- Historical pattern: {historical_density_json}
- Time to match end: {minutes_to_end} minutes
- Time horizon to predict: {time_horizon_min} minutes

Analyze crowd flow dynamics and predict bottleneck risk.
Respond ONLY with valid JSON:
{
  "zones_at_risk": [{"zone": "...", "predicted_density_pct": 85, "risk_level": "high"}],
  "confidence": 0.82,
  "suggested_actions": ["Open Gate C overflow", "Deploy staff to Section 110"],
  "reasoning": "<two sentences>"
}
```

**Fallback Rules** (when Gemini unavailable):
- Any zone currently > 80% density → mark as `high` risk in output
- Any zone currently > 60% density → mark as `medium` risk
- Suggested actions: generic templates from `stadium_config.fallback_actions`

### 6.4 Broadcast Compose Prompt

**Trigger**: `POST /api/reroute-broadcast`

**Prompt Template**:
```
You are drafting an emergency reroute announcement for fans inside a FIFA World Cup stadium.

CONTEXT:
- Affected zones: {affected_zones}
- Reason: {reason}
- Alternative routes: {alternative_routes}
- Language: Generate in English only (i18n system handles translation)

Requirements:
- Maximum 100 words
- Calm, clear, authoritative tone
- Include specific zone names and gate directions
- Do NOT cause panic

Respond ONLY with valid JSON:
{
  "message": "...",
  "severity": "info|warning|critical"
}
```

**Fallback**: Pre-written template strings indexed by `(reason_type, severity)`.

---

## 7. Real-time Architecture

### 7.1 SSE for Broadcasts

Server-Sent Events (SSE) provide unidirectional push from backend to fans. This approach was chosen over WebSockets because:
- Fan clients only need to **receive** data, not send it
- SSE is natively supported by browsers without additional libraries
- SSE connections auto-reconnect with `Last-Event-ID` support
- Lower server-side overhead than full WebSocket upgrades

**Connection Lifecycle**:
```
Fan Browser             Cloud Run Instance
    │                         │
    │  GET /api/sse/reroute   │
    │  Headers:               │
    │  Accept: text/event-stream
    │  X-Stadium-ID: {id}     │
    │────────────────────────►│
    │                         │  Register queue in sse_manager[stadium_id]
    │  HTTP 200               │
    │  Content-Type: text/event-stream
    │  Cache-Control: no-cache│
    │◄────────────────────────│
    │                         │
    │  : keepalive            │  (every 15 seconds)
    │◄────────────────────────│
    │                         │
    │  event: reroute         │  (when broadcast posted)
    │  data: {"message": "...",│
    │         "zones": [...],  │
    │         "id": "bc_123"}  │
    │◄────────────────────────│
    │                         │
    │  [connection drops]     │
    │  [auto-reconnect]       │
    │────────────────────────►│
    │  Last-Event-ID: bc_123  │  (replays missed events)
```

**SSE Manager** (`sse_manager.py`):
- `Dict[stadium_id, List[asyncio.Queue]]`
- Thread-safe via `asyncio` event loop
- Queue capacity: 100 messages per connection (prevents memory leak)
- Idle connections cleaned up after 2-hour TTL

### 7.2 Heatmap Polling

Heatmap data is delivered via **polling** (not SSE) because:
- Data is large (50×50 grid = 2,500 cells)
- Meaningful updates occur every 30–60 seconds (not per-second)
- Polling allows explicit cache headers (`Cache-Control: max-age=30`)

Fan PWA polls `GET /api/heatmap?stadium_id={id}` every 30 seconds. Ops Dashboard polls every 10 seconds for higher fidelity.

### 7.3 Firestore Real-time Listeners

The backend services use Firestore `on_snapshot` listeners to receive push updates for:
- **Incidents**: New incidents in the stadium trigger immediate SSE keepalive pulses to ops clients
- **Broadcasts**: Written broadcasts trigger SSE delivery (see §3.4)
- **Config changes**: Stadium config updates (gate status changes) refresh in-memory cache instantly

---

## 8. Scalability

### 8.1 Cloud Run Auto-scaling

The backend is configured for extreme scale to support FIFA World Cup traffic:

| Configuration           | Staging         | Production           |
|-------------------------|-----------------|----------------------|
| Min instances           | 1               | 5                    |
| Max instances           | 10              | 1000                 |
| CPU                     | 2 vCPU          | 2 vCPU               |
| Memory                  | 2 GiB           | 2 GiB                |
| Request timeout         | 60s             | 60s                  |
| Concurrency per instance| 80              | 80                   |
| Scale-up trigger        | 60% CPU         | 60% CPU              |

At 1000 instances × 80 concurrent requests = **80,000 concurrent requests** supported.

### 8.2 SSE Connection Handling at Scale

SSE connections are long-lived (hours) and stateful per-instance. This is the primary scaling challenge:

**Problem**: Fan A connects to Instance 1. Broadcast is posted and hits Instance 3. Fan A never receives the message.

**Solution**: The `POST /api/reroute-broadcast` endpoint writes to Firestore. Each Cloud Run instance maintains a Firestore `on_snapshot` listener on the `broadcasts` collection. When a new broadcast document appears, **all instances** enqueue the message into their local SSE queues simultaneously.

This fan-out pattern ensures every connected fan client receives every broadcast, regardless of which Cloud Run instance they are connected to.

```
                    Firestore (broadcasts collection)
                           ▲          │
                           │          │ on_snapshot triggers on all
    POST /reroute-broadcast│          │ instances simultaneously
                           │          ▼
              ┌────────────┼─────────────────────┐
              │            │                     │
         Instance 1    Instance 2           Instance 3
         (8,000 fans)  (8,000 fans)         (8,000 fans)
              │            │                     │
         SSE queues    SSE queues            SSE queues
              │            │                     │
           Fans          Fans                  Fans
```

### 8.3 Firestore Limits

| Metric                    | Limit                | Our Usage                  |
|---------------------------|----------------------|----------------------------|
| Writes per second         | 1 per document       | Heatmap: 1/30s per stadium |
| Reads per second          | Unlimited            | ~1000 reads/s at peak      |
| Document size             | 1 MiB                | Max ~50KB (heatmap grid)   |
| Simultaneous listeners    | Unlimited            | ~1000 (one per instance)   |
| Collections               | Unlimited            | 6 collections              |

---

## 9. Security

### 9.1 Application Default Credentials (ADC)

The backend **never** stores service account JSON keys in code or environment variables. All GCP service calls (Firestore, Vertex AI) authenticate via ADC:

- **Local development**: `gcloud auth application-default login`
- **Cloud Run**: The service account attached to the Cloud Run service is used automatically
- **CI/CD**: `GOOGLE_APPLICATION_CREDENTIALS` is set via the GitHub Actions `setup-gcloud` action using a secret JSON key (stored only in GitHub Secrets, never in code)

### 9.2 CORS Policy

```python
# backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://fan.matchday-command.com",
        "https://ops.matchday-command.com",
        "http://localhost:5173",   # Fan PWA dev
        "http://localhost:5174",   # Ops Dashboard dev
    ],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Stadium-ID", "X-Session-Token"],
    allow_credentials=False,
)
```

Wildcard origins (`*`) are **never** used in production.

### 9.3 Session Tokens

- Session tokens are UUIDv4 generated client-side
- They are ephemeral and expire 24 hours after match end
- Session tokens are never logged server-side
- Tokens have no inherent permissions — they are used only to associate language/zone preference

### 9.4 No PII in Logs

Cloud Logging structured log entries **never** contain:
- Fan names, email addresses, or phone numbers
- Device identifiers (IMEI, advertising IDs)
- Precise geolocation traces
- Session tokens

Staff IDs (in incident `reported_by`) are SHA-256 hashed before storage.

### 9.5 Input Validation

All request payloads are validated by Pydantic v2 models with strict type checking, `max_length` constraints, and enum validation. SQL injection and XSS are not applicable (NoSQL + React escaping), but prompt injection is mitigated via:
- Incident descriptions capped at 500 characters
- Descriptions HTML-stripped before inclusion in Gemini prompts
- AI responses validated against strict JSON schemas

---

## 10. Monitoring

### 10.1 Health Endpoint

`GET /api/health` returns a structured health report:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-07-07T10:05:00Z",
  "services": {
    "firestore": "connected",
    "vertex_ai": "available",
    "maps_api": "available"
  },
  "uptime_seconds": 3602
}
```

Status values: `healthy` | `degraded` | `unhealthy`

Cloud Run health checks call this endpoint every 10 seconds. If it returns non-200 for 3 consecutive checks, the instance is replaced.

### 10.2 Cloud Logging

All log entries use JSON structured format compatible with Cloud Logging:

```python
import json, logging

class JsonFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            "severity": record.levelname,
            "message": record.getMessage(),
            "component": record.name,
            "stadium_id": getattr(record, "stadium_id", None),
            "endpoint": getattr(record, "endpoint", None),
            "duration_ms": getattr(record, "duration_ms", None),
            "timestamp": self.formatTime(record),
        })
```

### 10.3 Error Reporting

Unhandled exceptions are automatically captured by Cloud Error Reporting (via the structured log `severity: ERROR` field). A Cloud Monitoring alert fires when the error rate exceeds 1% of requests over a 5-minute window.

### 10.4 Key Metrics to Monitor

| Metric                                | Alert Threshold        | Action                      |
|---------------------------------------|------------------------|-----------------------------|
| Backend P99 latency                   | > 2000ms               | Scale up Cloud Run          |
| SSE active connections                | > 70,000               | Pre-warm additional instances|
| Gemini API error rate                 | > 5%                   | Switch to rule-based fallback|
| Maps API quota usage                  | > 80%                  | Enable route caching         |
| Firestore read rate                   | > 500k reads/min       | Review polling intervals     |
| Cloud Run instance count              | > 800                  | Alert ops team               |
| `/api/health` non-200 responses       | Any                    | PagerDuty alert             |
