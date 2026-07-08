# MatchDay Command 🏟️⚽

[![CI/CD](https://github.com/your-org/matchday-command/actions/workflows/ci-cd.yml/badge.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)]()
[![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)]()
[![Node 20](https://img.shields.io/badge/node-20-green.svg)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688.svg)]()
[![Vertex AI](https://img.shields.io/badge/Vertex%20AI-Gemini%201.5%20Pro-4285F4.svg)]()

> AI-powered stadium operations & fan experience platform for FIFA World Cup 2026

MatchDay Command unifies real-time crowd management, AI-driven incident triage, and intelligent fan navigation into a single, cloud-native platform capable of serving **80,000+ concurrent fans** per venue across all 16 FIFA World Cup 2026 stadiums.

---

## Architecture

```
┌──────────────────────┐          ┌──────────────────────────┐
│      Fan PWA          │          │    Ops Dashboard          │
│  (React + Vite + i18n)│          │  (React + Vite + Dark UI) │
└──────────┬───────────┘          └────────────┬─────────────┘
           │  HTTPS / SSE                       │  HTTPS / SSE
           └──────────────────┬─────────────────┘
                              ▼
                  ┌───────────────────────┐
                  │   FastAPI Backend      │
                  │  (Cloud Run × 1000)    │
                  └─────┬──────┬──────────┘
                        │      │
           ┌────────────┘      └───────────────┐
           ▼                                   ▼
┌──────────────────┐                ┌──────────────────────┐
│   Cloud Firestore │                │  Vertex AI (Gemini)   │
│  • incidents      │                │  • Incident Triage    │
│  • broadcasts     │                │  • Bottleneck Predict │
│  • heatmap_snaps  │                │  • Broadcast Compose  │
│  • routes cache   │                └──────────────────────┘
└──────────────────┘
           │
           ▼
┌──────────────────┐
│  Google Maps API  │
│  • Route calc     │
│  • Geocoding      │
└──────────────────┘
```

---

## Feature Highlights

| Feature | Fan PWA | Ops Dashboard |
|---|---|---|
| **Real-time Crowd Heatmap** | 🟢 View nearby density | 🟢 Full stadium view with zone labels |
| **Smart Route Navigation** | 🟢 AI-optimized walking routes | 🟢 Route override controls |
| **Live Alert Broadcast** | 🟢 SSE push alerts | 🟢 Compose & send broadcasts |
| **Incident Management** | ❌ | 🟢 Kanban board, AI triage |
| **Bottleneck Prediction** | ❌ | 🟢 AI prediction with confidence % |
| **Multilingual (i18n)** | 🟢 8 languages, RTL support | 🟡 English only |
| **PWA / Offline Mode** | 🟢 Cached app shell, BG sync | ❌ |
| **Accessibility (WCAG 2.1 AA)** | 🟢 Full compliance | 🟢 Full compliance |
| **Dark Mode** | 🟡 System preference | 🟢 Manual toggle |
| **SSE Real-time Alerts** | 🟢 Auto-reconnect | 🟢 Monitor fan connections |

---

## Quick Start

### Prerequisites

- Python 3.11+, Node.js 20+, Docker, gcloud CLI
- A Google Cloud project with billing enabled

### 1. Clone & Configure

```bash
git clone https://github.com/your-org/matchday-command.git
cd matchday-command

# Set up Application Default Credentials
gcloud auth application-default login
gcloud config set project YOUR_GCP_PROJECT_ID
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv && source venv/bin/activate  # Windows: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
# Edit .env: set GOOGLE_CLOUD_PROJECT, GOOGLE_MAPS_API_KEY, USE_REAL_FIRESTORE=false
uvicorn app.main:app --port 8080 --reload
```

### 3. Fan PWA Setup

```bash
cd frontend/fan-pwa
npm install
cp .env.example .env.local
# Edit .env.local: VITE_API_BASE_URL=http://localhost:8080
npm run dev
# → http://localhost:5173
```

### 4. Ops Dashboard Setup

```bash
cd frontend/ops-dashboard
npm install
cp .env.example .env.local
# Edit .env.local: VITE_API_BASE_URL=http://localhost:8080
npm run dev
# → http://localhost:5174
```

### 5. Run All Tests

```bash
# Backend (from /backend, venv activated)
pytest tests/ --cov=app -v

# Frontend PWA
cd frontend/fan-pwa && npm run test:coverage

# Ops Dashboard
cd frontend/ops-dashboard && npm run test:coverage
```

---

## API Endpoints

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 1 | `POST` | `/api/route` | Calculate AI-optimized fan walking route |
| 2 | `GET` | `/api/heatmap` | Retrieve real-time crowd density heatmap |
| 3 | `GET` | `/api/incidents` | List active stadium incidents |
| 4 | `POST` | `/api/incidents` | Report a new incident |
| 5 | `POST` | `/api/incidents/{id}/triage` | Run AI triage on an incident |
| 6 | `POST` | `/api/predict-bottleneck` | Predict crowd bottlenecks (AI) |
| 7 | `POST` | `/api/reroute-broadcast` | Broadcast reroute to all fans via SSE |
| 8 | `GET` | `/api/sse/reroute` | SSE stream for live reroute alerts |
| 9 | `GET` | `/api/health` | System health check |

Full API reference: [docs/API_SPEC.md](docs/API_SPEC.md)

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Backend** | FastAPI | 0.111 | REST API + SSE server |
| **Backend Runtime** | Python | 3.11 | Language |
| **AI Engine** | Vertex AI Gemini | 1.5 Pro | Triage, prediction, broadcast |
| **Database** | Cloud Firestore | Native Mode | Real-time NoSQL |
| **Maps** | Google Maps Platform | — | Directions & geocoding |
| **Fan Frontend** | React + Vite | 18 + 5 | Progressive Web App |
| **Ops Frontend** | React + Vite | 18 + 5 | Operations dashboard |
| **i18n** | react-i18next | 14 | 8 languages + RTL |
| **PWA** | vite-plugin-pwa | — | Service worker, offline |
| **Hosting (API)** | Cloud Run | — | Auto-scaling containers |
| **Hosting (UI)** | Vercel | — | Edge CDN, PR previews |
| **CI/CD** | GitHub Actions | — | Automated test + deploy |
| **Testing (BE)** | pytest + pytest-cov | — | Unit + integration tests |
| **Testing (FE)** | Vitest + Testing Library | — | Component + unit tests |
| **Auth (GCP)** | ADC (no keys in code) | — | Secure GCP service access |

---

## Challenge Alignment

This platform is purpose-built to address the FIFA World Cup 2026 challenge domains:

| Challenge Domain | Implementation | Status |
|---|---|---|
| **Fan Navigation & Wayfinding** | `POST /api/route` — crowd-aware route calculation using Google Maps + live heatmap density penalty. Polyline overlay in Fan PWA with accessibility mode. | ✅ Complete |
| **Crowd Management** | Real-time 50×50 density grid heatmap. SSE broadcast system reaching 80k fans. AI bottleneck prediction with 30–120 min horizon. | ✅ Complete |
| **Incident Response** | Incident lifecycle management (open → triaged → resolved). Gemini AI triage assigns P1–P4 priority with recommended actions in <2 seconds. | ✅ Complete |
| **Real-time Communication** | Server-Sent Events with auto-reconnect + missed event replay. Keepalive every 15s. Broadcasts fan-out via Firestore listeners across 1000 Cloud Run instances. | ✅ Complete |
| **Multilingual Fan Experience** | 8 languages (en, es, fr, ar, pt, de, ja, zh). RTL layout for Arabic. All UI strings externalized. Auto-detects browser locale. | ✅ Complete |
| **Graceful Degradation** | No single point of failure. Rule-based fallbacks for Gemini. Cached route fallbacks for Maps. In-memory store fallback for Firestore. Offline mode for fans. | ✅ Complete |
| **Accessibility** | WCAG 2.1 AA compliant. ARIA labels, focus management, 4.5:1 color contrast, keyboard navigation, screen reader support. | ✅ Complete |
| **Scalability** | Cloud Run: 1000 max instances × 80 concurrency = 80,000 concurrent requests. Firestore fan-out SSE pattern for cross-instance broadcasts. | ✅ Complete |

---

## Project Structure

```
matchday-command/
├── .github/
│   └── workflows/
│       └── ci-cd.yml              # GitHub Actions CI/CD pipeline
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app + CORS + routers
│   │   ├── routers/               # 8 endpoint routers
│   │   ├── services/              # Firestore, Maps, Gemini, SSE
│   │   └── models/                # Pydantic request/response models
│   ├── tests/                     # pytest test suite
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .dockerignore
├── frontend/
│   ├── fan-pwa/                   # React PWA for fans
│   │   ├── src/
│   │   │   ├── components/        # RouteMap, AlertBanner, HeatmapOverlay, etc.
│   │   │   ├── locales/           # i18n JSON files (8 languages)
│   │   │   └── hooks/             # useSSE, useHeatmap, useRoute
│   │   ├── public/
│   │   │   └── manifest.json      # PWA manifest
│   │   └── vite.config.ts
│   └── ops-dashboard/             # React dashboard for ops staff
│       ├── src/
│       │   ├── components/        # IncidentBoard, HeatmapViewer, ReroutePanel, etc.
│       │   └── hooks/             # useIncidents, usePrediction, useBroadcast
│       └── vite.config.ts
├── docs/
│   ├── ARCHITECTURE.md            # System architecture (this doc)
│   ├── API_SPEC.md                # Full API reference
│   └── DEPLOYMENT.md              # Deployment guide
├── package.json                   # Root monorepo scripts
├── .gitignore
└── README.md
```

---

## Deployment

See the full deployment guide: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

### Quick Cloud Run Deploy

```bash
export GCP_PROJECT_ID="your-project-id"
GIT_SHA=$(git rev-parse --short HEAD)

# Build and push
gcloud builds submit \
  --tag gcr.io/${GCP_PROJECT_ID}/matchday-backend:${GIT_SHA} \
  ./backend

# Deploy to production
gcloud run deploy matchday-backend \
  --image gcr.io/${GCP_PROJECT_ID}/matchday-backend:${GIT_SHA} \
  --platform managed --region us-central1 \
  --memory 2Gi --cpu 2 --max-instances 1000 \
  --set-env-vars USE_REAL_FIRESTORE=true,GOOGLE_CLOUD_PROJECT=${GCP_PROJECT_ID}
```

### CI/CD Pipeline

The GitHub Actions pipeline automatically:
- Runs backend pytest + coverage on every push/PR
- Runs frontend Vitest + build on every push/PR
- Deploys to **staging** on push to `develop`
- Deploys to **production** on push to `main`

Required GitHub Secrets: `GCP_PROJECT_ID`, `GCP_SA_KEY`

---

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `GOOGLE_CLOUD_PROJECT` | Backend | GCP project ID |
| `GOOGLE_MAPS_API_KEY` | Backend | Maps Platform API key |
| `USE_REAL_FIRESTORE` | Backend | `true` = Firestore; `false` = in-memory mock |
| `VERTEX_AI_LOCATION` | Backend | GCP region for Vertex AI (default: `us-central1`) |
| `VITE_API_BASE_URL` | Frontend | Backend API base URL |

Full reference: [docs/DEPLOYMENT.md#3-environment-variables](docs/DEPLOYMENT.md#3-environment-variables)

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes with tests
4. Run the full test suite: `npm run test:all`
5. Submit a pull request to `develop`

All pull requests must pass the CI pipeline (backend + frontend tests + build) before merging.

---

## License

[MIT](LICENSE) © 2026 MatchDay Command Contributors

This project was developed for the FIFA World Cup 2026 Hackathon Challenge.
