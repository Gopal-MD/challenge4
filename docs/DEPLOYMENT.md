# MatchDay Command — Deployment Guide

> **Version**: 1.0.0 | **Last Updated**: 2026-07-07 | **Target Platform**: Google Cloud Run

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Environment Variables](#3-environment-variables)
4. [Docker Build & Run](#4-docker-build--run)
5. [Cloud Run Deployment](#5-cloud-run-deployment)
6. [Frontend Deployment](#6-frontend-deployment)
7. [IAM Setup](#7-iam-setup)
8. [Firestore Setup](#8-firestore-setup)
9. [Monitoring](#9-monitoring)
10. [Troubleshooting](#10-troubleshooting)
11. [Secrets Management](#11-secrets-management)

---

## 1. Prerequisites

Ensure the following tools are installed and available on `PATH` before proceeding.

### Required Tools

| Tool             | Minimum Version | Install Command / Link                                |
|------------------|-----------------|-------------------------------------------------------|
| Python           | 3.11+           | `winget install Python.Python.3.11` / python.org      |
| Node.js          | 20+             | `winget install OpenJS.NodeJS.LTS` / nodejs.org       |
| npm              | 9+              | Bundled with Node.js 20                               |
| Docker Desktop   | 24+             | docker.com/products/docker-desktop                    |
| gcloud CLI       | 450+            | cloud.google.com/sdk/docs/install                     |
| Git              | 2.40+           | git-scm.com                                           |

### Verify Installation

```bash
# Verify all required tools
python --version        # Python 3.11.x
node --version          # v20.x.x
npm --version           # 9.x.x or 10.x.x
docker --version        # Docker version 24.x.x
gcloud --version        # Google Cloud SDK 450.x.x
git --version           # git version 2.40.x
```

### GCP Project

You need a Google Cloud project with:
- Billing enabled
- Owner or Editor IAM role (for initial setup)
- The following APIs enabled (see §8 for commands):
  - Cloud Firestore API
  - Vertex AI API
  - Cloud Run API
  - Cloud Build API
  - Google Maps Platform (Directions API, Maps JavaScript API)

---

## 2. Local Development Setup

Follow these steps in order to get the full stack running locally.

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/matchday-command.git
cd matchday-command
```

### Step 2: Configure GCP Authentication (ADC)

```bash
# Authenticate with your Google account
gcloud auth login

# Set up Application Default Credentials for local development
gcloud auth application-default login

# Set your GCP project
gcloud config set project YOUR_GCP_PROJECT_ID
```

### Step 3: Set Up the Backend

```bash
# Navigate to backend directory
cd backend

# Create a Python virtual environment
python -m venv venv

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Windows CMD:
venv\Scripts\activate.bat

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your values (see §3 for reference)
# At minimum, set:
# GOOGLE_CLOUD_PROJECT=your-project-id
# GOOGLE_MAPS_API_KEY=your-maps-key
# USE_REAL_FIRESTORE=false  (for local dev without Firestore)
```

### Step 4: Start the Backend

```bash
# From the backend/ directory (venv activated)
uvicorn app.main:app --port 8080 --reload

# Verify it's running:
curl http://localhost:8080/api/health
```

Expected output:
```json
{"status": "healthy", "version": "1.0.0", ...}
```

### Step 5: Set Up the Fan PWA

```bash
# In a new terminal, from repo root
cd frontend/fan-pwa

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local:
# VITE_API_BASE_URL=http://localhost:8080

# Start development server
npm run dev
# PWA will be available at http://localhost:5173
```

### Step 6: Set Up the Ops Dashboard

```bash
# In another new terminal, from repo root
cd frontend/ops-dashboard

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local:
# VITE_API_BASE_URL=http://localhost:8080

# Start development server
npm run dev
# Dashboard will be available at http://localhost:5174
```

### Step 7: Run All Tests

```bash
# From repo root
# Backend tests (with coverage)
cd backend && pytest tests/ --cov=app --cov-report=term-missing -v && cd ..

# PWA tests
cd frontend/fan-pwa && npm run test:coverage && cd ../..

# Dashboard tests
cd frontend/ops-dashboard && npm run test:coverage && cd ../..

# Or use the root script (requires npm):
npm run test:all
```

---

## 3. Environment Variables

### Backend Environment Variables (`backend/.env`)

| Variable               | Default             | Required | Description                                             |
|------------------------|---------------------|----------|---------------------------------------------------------|
| `GOOGLE_CLOUD_PROJECT` | `""`                | Yes*     | GCP project ID. *Required when `USE_REAL_FIRESTORE=true`|
| `GOOGLE_MAPS_API_KEY`  | `""`                | Cond.    | Maps API key. Falls back to cached routes if empty      |
| `USE_REAL_FIRESTORE`   | `false`             | No       | `true` = real Firestore; `false` = in-memory mock       |
| `VERTEX_AI_LOCATION`   | `us-central1`       | No       | GCP region for Vertex AI (Gemini) calls                 |
| `GEMINI_MODEL`         | `gemini-1.5-pro`    | No       | Gemini model name                                       |
| `SSE_KEEPALIVE_SEC`    | `15`                | No       | Seconds between SSE keepalive pings                     |
| `SSE_QUEUE_SIZE`       | `100`               | No       | Max queued SSE messages per connection                  |
| `CORS_ORIGINS`         | `http://localhost:5173,http://localhost:5174` | No | Comma-separated allowed CORS origins |
| `LOG_LEVEL`            | `INFO`              | No       | Python logging level: `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `HEATMAP_CACHE_TTL`    | `30`                | No       | Seconds to cache heatmap in memory                      |
| `PORT`                 | `8080`              | No       | Port the FastAPI app listens on                         |

> **Never commit `.env` files.** They are excluded by `.gitignore`. Use `.env.example` as a template only.

### Frontend Environment Variables (Fan PWA — `frontend/fan-pwa/.env.local`)

| Variable                  | Default                          | Required | Description                      |
|---------------------------|----------------------------------|----------|----------------------------------|
| `VITE_API_BASE_URL`       | `http://localhost:8080`          | Yes      | Backend API base URL             |
| `VITE_DEFAULT_LOCALE`     | `en`                             | No       | Default i18n locale              |
| `VITE_MAPBOX_TOKEN`       | `""`                             | No       | Mapbox token for tile layer      |
| `VITE_ENABLE_ANALYTICS`   | `false`                          | No       | Enable privacy-safe analytics    |

### Frontend Environment Variables (Ops Dashboard — `frontend/ops-dashboard/.env.local`)

| Variable                  | Default                          | Required | Description                      |
|---------------------------|----------------------------------|----------|----------------------------------|
| `VITE_API_BASE_URL`       | `http://localhost:8080`          | Yes      | Backend API base URL             |
| `VITE_DEFAULT_THEME`      | `dark`                           | No       | Default UI theme: `light`/`dark` |
| `VITE_POLL_INTERVAL_MS`   | `10000`                          | No       | Heatmap polling interval (ms)    |

---

## 4. Docker Build & Run

### Build the Backend Image

```bash
# From repo root
docker build -t matchday-backend:local ./backend

# Verify the build succeeded
docker images matchday-backend:local
```

### Run the Backend Container Locally

```bash
docker run \
  --rm \
  -p 8080:8080 \
  -e USE_REAL_FIRESTORE=false \
  -e GOOGLE_CLOUD_PROJECT="" \
  -e GOOGLE_MAPS_API_KEY="" \
  -e LOG_LEVEL=INFO \
  matchday-backend:local

# Test it's running
curl http://localhost:8080/api/health
```

### Run with Real Firestore (using ADC volume mount)

```bash
docker run \
  --rm \
  -p 8080:8080 \
  -e USE_REAL_FIRESTORE=true \
  -e GOOGLE_CLOUD_PROJECT=your-project-id \
  -e GOOGLE_APPLICATION_CREDENTIALS=/tmp/adc/application_default_credentials.json \
  -v "$HOME/.config/gcloud/application_default_credentials.json:/tmp/adc/application_default_credentials.json:ro" \
  matchday-backend:local
```

### Docker Compose (Full Stack Local)

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down
```

---

## 5. Cloud Run Deployment

### 5.1 Initial GCP Setup

```bash
# Set your project
export GCP_PROJECT_ID="your-gcp-project-id"
export GCP_REGION="us-central1"
export IMAGE_TAG="gcr.io/${GCP_PROJECT_ID}/matchday-backend"

gcloud config set project $GCP_PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  aiplatform.googleapis.com \
  firestore.googleapis.com \
  maps-backend.googleapis.com
```

### 5.2 Build and Push Image via Cloud Build

```bash
# Build and push to Google Container Registry
gcloud builds submit \
  --tag ${IMAGE_TAG}:latest \
  ./backend

# Or tag with git SHA for traceability
GIT_SHA=$(git rev-parse --short HEAD)
gcloud builds submit \
  --tag ${IMAGE_TAG}:${GIT_SHA} \
  ./backend
```

### 5.3 Deploy to Staging

```bash
gcloud run deploy matchday-backend-staging \
  --image ${IMAGE_TAG}:${GIT_SHA} \
  --platform managed \
  --region ${GCP_REGION} \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 60 \
  --min-instances 1 \
  --max-instances 10 \
  --concurrency 80 \
  --set-env-vars "USE_REAL_FIRESTORE=true,GOOGLE_CLOUD_PROJECT=${GCP_PROJECT_ID},VERTEX_AI_LOCATION=us-central1" \
  --service-account matchday-backend@${GCP_PROJECT_ID}.iam.gserviceaccount.com

# Get the staging URL
gcloud run services describe matchday-backend-staging \
  --platform managed \
  --region ${GCP_REGION} \
  --format "value(status.url)"
```

### 5.4 Deploy to Production

```bash
gcloud run deploy matchday-backend \
  --image ${IMAGE_TAG}:${GIT_SHA} \
  --platform managed \
  --region ${GCP_REGION} \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 60 \
  --min-instances 5 \
  --max-instances 1000 \
  --concurrency 80 \
  --set-env-vars "USE_REAL_FIRESTORE=true,GOOGLE_CLOUD_PROJECT=${GCP_PROJECT_ID},VERTEX_AI_LOCATION=us-central1" \
  --service-account matchday-backend@${GCP_PROJECT_ID}.iam.gserviceaccount.com

# Verify production deployment
PROD_URL=$(gcloud run services describe matchday-backend \
  --platform managed --region ${GCP_REGION} --format "value(status.url)")
curl ${PROD_URL}/api/health
```

### 5.5 Set Google Maps API Key as Secret

Never pass the Maps API key as a plain environment variable in production. Use Secret Manager:

```bash
# Create the secret
echo -n "YOUR_MAPS_API_KEY" | \
  gcloud secrets create matchday-maps-api-key --data-file=-

# Grant Cloud Run service access to the secret
gcloud secrets add-iam-policy-binding matchday-maps-api-key \
  --member="serviceAccount:matchday-backend@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Update Cloud Run to load the key from Secret Manager
gcloud run services update matchday-backend \
  --update-secrets="GOOGLE_MAPS_API_KEY=matchday-maps-api-key:latest" \
  --region ${GCP_REGION}
```

### 5.6 Custom Domain (Optional)

```bash
# Map custom domain to Cloud Run service
gcloud run domain-mappings create \
  --service matchday-backend \
  --domain api.matchday-command.com \
  --region ${GCP_REGION}

# Follow DNS verification instructions in the output
```

---

## 6. Frontend Deployment

### 6.1 Fan PWA — Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# From frontend/fan-pwa directory
cd frontend/fan-pwa

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Set environment variables in Vercel dashboard or via CLI:
vercel env add VITE_API_BASE_URL production
# Enter: https://api.matchday-command.com
```

**Vercel Project Settings** (set in Vercel dashboard):

| Setting              | Value                                   |
|----------------------|-----------------------------------------|
| Framework Preset     | Vite                                    |
| Build Command        | `npm run build`                         |
| Output Directory     | `dist`                                  |
| Install Command      | `npm ci`                                |
| Node.js Version      | 20.x                                    |

**Custom Domain**: Set `fan.matchday-command.com` as a custom domain in the Vercel project settings.

### 6.2 Ops Dashboard — Vercel Deployment

```bash
cd frontend/ops-dashboard

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Set environment variable
vercel env add VITE_API_BASE_URL production
# Enter: https://api.matchday-command.com
```

**Custom Domain**: Set `ops.matchday-command.com` in the Vercel project settings.

### 6.3 Vercel CI/CD Integration

Connect the GitHub repository to Vercel for automatic deployments:

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the `matchday-command` repository
3. Configure two separate Vercel projects:
   - **matchday-fan-pwa**: Root Directory = `frontend/fan-pwa`
   - **matchday-ops-dashboard**: Root Directory = `frontend/ops-dashboard`
4. Each project will auto-deploy on pushes to `main` and create preview deployments for pull requests.

---

## 7. IAM Setup

### 7.1 Create Service Account

```bash
# Create service account for Cloud Run backend
gcloud iam service-accounts create matchday-backend \
  --display-name "MatchDay Command Backend"
```

### 7.2 Assign Required Roles

```bash
SA_EMAIL="matchday-backend@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

# Firestore access
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/datastore.user"

# Vertex AI access (Gemini)
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/aiplatform.user"

# Secret Manager access (Maps API key)
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

# Cloud Logging write
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/logging.logWriter"

# Cloud Trace write (for performance monitoring)
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudtrace.agent"
```

### 7.3 Local ADC Setup for Developers

```bash
# Developer machines: use personal Google account with ADC
gcloud auth application-default login

# The ADC credentials are stored at:
# macOS/Linux: ~/.config/gcloud/application_default_credentials.json
# Windows: %APPDATA%\gcloud\application_default_credentials.json
```

Developers need at minimum:
- `roles/datastore.user` on the dev/staging Firestore database
- `roles/aiplatform.user` for Gemini calls

---

## 8. Firestore Setup

### 8.1 Enable Firestore API

```bash
gcloud services enable firestore.googleapis.com --project=${GCP_PROJECT_ID}
```

### 8.2 Create Firestore Database

```bash
# Create Firestore in Native mode (required for real-time listeners)
gcloud firestore databases create \
  --location=us-central1 \
  --project=${GCP_PROJECT_ID}
```

### 8.3 Firestore Security Rules

Deploy the following security rules (stored in `firestore.rules`):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Stadium config — public read, no client writes
    match /stadium_config/{stadiumId} {
      allow read: if true;
      allow write: if false; // Backend service account only via Admin SDK
    }

    // Incidents — public read for dashboard; backend writes only
    match /incidents/{incidentId} {
      allow read: if true;
      allow write: if false; // Backend only
    }

    // Broadcasts — public read; backend writes only
    match /broadcasts/{broadcastId} {
      allow read: if true;
      allow write: if false; // Backend only
    }

    // Heatmap snapshots — public read; backend writes only
    match /heatmap_snapshots/{snapshotId} {
      allow read: if true;
      allow write: if false; // Backend only
    }

    // Routes cache — public read; backend writes only
    match /routes/{routeId} {
      allow read: if true;
      allow write: if false; // Backend only
    }

    // User sessions — session owner read only
    match /user_sessions/{sessionToken} {
      allow read: if false;  // Server-side only
      allow write: if false; // Server-side only
    }
  }
}
```

Deploy the rules:

```bash
firebase deploy --only firestore:rules
```

### 8.4 Firestore Indexes

Create composite indexes for common query patterns:

```bash
# incidents by stadium + status (for GET /api/incidents filter)
gcloud firestore indexes composite create \
  --collection-group=incidents \
  --field-config=field-path=stadium_id,order=ASCENDING \
  --field-config=field-path=status,order=ASCENDING \
  --field-config=field-path=created_at,order=DESCENDING

# broadcasts by stadium + created_at (for SSE replay)
gcloud firestore indexes composite create \
  --collection-group=broadcasts \
  --field-config=field-path=stadium_id,order=ASCENDING \
  --field-config=field-path=created_at,order=DESCENDING

# heatmap_snapshots by stadium + captured_at (for historical prediction)
gcloud firestore indexes composite create \
  --collection-group=heatmap_snapshots \
  --field-config=field-path=stadium_id,order=ASCENDING \
  --field-config=field-path=captured_at,order=DESCENDING
```

Or deploy all indexes from `firestore.indexes.json`:

```bash
firebase deploy --only firestore:indexes
```

---

## 9. Monitoring

### 9.1 Cloud Logging Dashboard

View structured backend logs in the GCP Console:

```bash
# Stream backend logs in real time
gcloud logging tail \
  "resource.type=cloud_run_revision AND resource.labels.service_name=matchday-backend" \
  --format="value(jsonPayload.message,jsonPayload.severity,jsonPayload.stadium_id)"
```

Key log queries in the GCP Console Logs Explorer:

```
# All errors in the last hour
resource.type="cloud_run_revision"
resource.labels.service_name="matchday-backend"
severity>=ERROR
timestamp>="2026-07-07T09:00:00Z"

# Gemini fallback activations
resource.type="cloud_run_revision"
jsonPayload.message=~"gemini.*unavailable|rule-based fallback"

# Slow requests (>1000ms)
resource.type="cloud_run_revision"
jsonPayload.duration_ms>1000
```

### 9.2 Alert Policies

Create alerting policies for critical conditions:

```bash
# Error rate alert (>1% errors over 5 min window)
gcloud alpha monitoring policies create \
  --policy-from-file=monitoring/error-rate-alert.json

# Latency alert (P99 > 2s)
gcloud alpha monitoring policies create \
  --policy-from-file=monitoring/latency-alert.json

# Instance count alert (>800 instances)
gcloud alpha monitoring policies create \
  --policy-from-file=monitoring/instance-count-alert.json
```

### 9.3 Health Check Uptime Monitoring

```bash
# Create uptime check for health endpoint
gcloud monitoring uptime-check-configs create \
  --display-name="MatchDay Backend Health" \
  --http-check-path="/api/health" \
  --hostname="api.matchday-command.com" \
  --port=443 \
  --use-ssl \
  --period=10s \
  --timeout=5s
```

---

## 10. Troubleshooting

### Issue 1: `google.auth.exceptions.DefaultCredentialsError`

**Symptom**: Backend throws `DefaultCredentialsError: Could not automatically determine credentials`.

**Cause**: ADC is not set up on the machine, or the service account doesn't have required roles.

**Solution**:
```bash
# For local development:
gcloud auth application-default login

# For Cloud Run: verify the service account is attached
gcloud run services describe matchday-backend \
  --format="value(spec.template.spec.serviceAccountName)"
```

---

### Issue 2: Firestore permission denied

**Symptom**: `google.api_core.exceptions.PermissionDenied: 403 Missing or insufficient permissions`.

**Cause**: Service account is missing `roles/datastore.user`.

**Solution**:
```bash
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:matchday-backend@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```

---

### Issue 3: CORS errors in browser

**Symptom**: `Access-Control-Allow-Origin` header missing or mismatched.

**Cause**: Frontend dev server URL not in the backend's `CORS_ORIGINS` list.

**Solution**: Add the frontend URL to the `CORS_ORIGINS` env var:
```bash
# In backend/.env
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,https://fan.matchday-command.com
```

---

### Issue 4: SSE connection drops after ~60 seconds

**Symptom**: Fan PWA SSE connection disconnects every ~60 seconds.

**Cause**: Cloud Run has a default 60-second request timeout, which kills long-lived SSE connections.

**Solution**: Increase the Cloud Run timeout and ensure keepalives are sent:
```bash
gcloud run services update matchday-backend \
  --timeout=3600 \
  --region=${GCP_REGION}
```

---

### Issue 5: `npm run dev` fails with ENOENT

**Symptom**: `Error: ENOENT: no such file or directory, open 'node_modules/.../vite'`

**Cause**: Dependencies not installed.

**Solution**:
```bash
cd frontend/fan-pwa && npm install
# or from root:
npm run install:all
```

---

### Issue 6: Gemini returns non-JSON output

**Symptom**: `json.JSONDecodeError` in backend logs when calling Gemini.

**Cause**: Gemini occasionally wraps JSON in markdown code fences (````json ... ````).

**Solution**: The `gemini_service.py` strips markdown code fences before parsing. If this persists, update the prompt to reinforce: `Respond ONLY with raw JSON, no markdown, no explanation.`

---

### Issue 7: `pytest` fails with import errors

**Symptom**: `ModuleNotFoundError: No module named 'app'`

**Cause**: Tests must be run from the `backend/` directory, not repo root.

**Solution**:
```bash
cd backend
pytest tests/ -v
```

---

### Issue 8: Docker build fails on `COPY requirements.txt`

**Symptom**: `COPY failed: file not found in build context`

**Cause**: Running `docker build` from the wrong directory.

**Solution**:
```bash
# Always build from repo root, pointing to backend/ subdirectory:
docker build -t matchday-backend:local ./backend
```

---

### Issue 9: Vercel build fails with `VITE_API_BASE_URL not defined`

**Symptom**: Frontend builds but API calls go to `undefined/api/route`.

**Cause**: Vite environment variables must be set in Vercel project settings.

**Solution**: In the Vercel dashboard → Project → Settings → Environment Variables:
- Name: `VITE_API_BASE_URL`
- Value: `https://api.matchday-command.com`
- Environment: Production ✅, Preview ✅, Development ✅

---

### Issue 10: Cloud Run cold starts causing timeouts

**Symptom**: First request after inactivity takes 5–10 seconds.

**Cause**: Cloud Run with `min-instances=0` spins up a new container on the first request.

**Solution**:
```bash
gcloud run services update matchday-backend \
  --min-instances=5 \
  --region=${GCP_REGION}
```

Setting `min-instances=5` ensures 5 warm instances are always available. This adds ~$50/month to GCP costs but eliminates cold starts for production match-day traffic.

---

## 11. Secrets Management

### GitHub Actions Secrets Setup

Add the following secrets to your GitHub repository at
**Settings → Secrets and variables → Actions → New repository secret**:

| Secret Name        | Value                                  | Used By                           |
|--------------------|----------------------------------------|-----------------------------------|
| `GCP_PROJECT_ID`   | Your GCP project ID                    | All deployment jobs               |
| `GCP_SA_KEY`       | JSON key for CI/CD service account     | `setup-gcloud` authentication     |
| `MAPS_API_KEY`     | Google Maps Platform API key           | Backend deployment env vars       |

### Creating the CI/CD Service Account Key

```bash
# Create a dedicated CI/CD service account (separate from backend runtime SA)
gcloud iam service-accounts create matchday-cicd \
  --display-name "MatchDay CI/CD Pipeline"

# Assign Cloud Build and Cloud Run deployer roles
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:matchday-cicd@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.editor"

gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:matchday-cicd@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:matchday-cicd@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:matchday-cicd@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Generate JSON key for GitHub Actions
gcloud iam service-accounts keys create cicd-key.json \
  --iam-account=matchday-cicd@${GCP_PROJECT_ID}.iam.gserviceaccount.com

# Copy the content of cicd-key.json to the GCP_SA_KEY GitHub secret
cat cicd-key.json

# IMPORTANT: Delete the local key file immediately after copying
rm cicd-key.json
```

> **Security Warning**: Never commit service account JSON keys to version control. The `.gitignore` excludes `*.json` files by default (except `package.json`, etc.) to prevent accidental commits.

### Key Rotation

Service account keys should be rotated every 90 days:

```bash
# List existing keys
gcloud iam service-accounts keys list \
  --iam-account=matchday-cicd@${GCP_PROJECT_ID}.iam.gserviceaccount.com

# Create new key
gcloud iam service-accounts keys create new-cicd-key.json \
  --iam-account=matchday-cicd@${GCP_PROJECT_ID}.iam.gserviceaccount.com

# Update GitHub secret with new key content, then delete old key
gcloud iam service-accounts keys delete OLD_KEY_ID \
  --iam-account=matchday-cicd@${GCP_PROJECT_ID}.iam.gserviceaccount.com
```
