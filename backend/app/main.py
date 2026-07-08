"""
MatchDay Command — FastAPI Application Entry Point

FIFA World Cup 2026 Stadium Operations & Fan Experience Platform
Serves both the Fan PWA and Ops Dashboard backends.
"""
from __future__ import annotations
import time
import logging
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.utils.logging import setup_logging
from app.routes import route, crowd, incident, predict, broadcast

# Initialize structured logging first
setup_logging(settings.log_level)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="MatchDay Command API",
    description=(
        "FIFA World Cup 2026 AI-powered stadium operations and fan experience platform. "
        "Powers real-time crowd management, incident triage, multilingual reroute broadcasts, "
        "and accessible fan navigation for 80,000+ concurrent users."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS middleware (permissive for hackathon demo; restrict in production)
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request counting middleware
# ---------------------------------------------------------------------------

_start_time = time.time()
_request_count = 0


@app.middleware("http")
async def count_requests(request: Request, call_next):
    global _request_count
    _request_count += 1
    response = await call_next(request)
    return response


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(route.router)
app.include_router(crowd.router)
app.include_router(incident.router)
app.include_router(predict.router)
app.include_router(broadcast.router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/api/health", tags=["System"])
async def health_check():
    """
    Health check endpoint. Reports status of all dependent services.
    Always returns 200; individual service statuses may be 'degraded'.
    """
    # Firestore
    firestore_status = "healthy"
    if settings.use_real_firestore:
        try:
            from app.services.firestore import get_firestore_client
            client = get_firestore_client()
            firestore_status = "healthy" if client else "degraded"
        except Exception:
            firestore_status = "degraded"

    # Vertex AI
    vertex_status = "healthy" if settings.google_cloud_project else "degraded"

    # Google Maps
    maps_status = "healthy" if settings.google_maps_api_key else "degraded"

    uptime = int(time.time() - _start_time)

    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "firestore": firestore_status,
            "vertex_ai": vertex_status,
            "google_maps_api": maps_status,
            "cloud_logging": "healthy",
        },
        "uptime_seconds": uptime,
        "request_count_last_hour": _request_count,
        "mode": "real_firestore" if settings.use_real_firestore else "mock_firestore",
    }


# ---------------------------------------------------------------------------
# Root redirect
# ---------------------------------------------------------------------------

@app.get("/", include_in_schema=False)
async def root():
    return JSONResponse(
        content={
            "name": "MatchDay Command API",
            "version": "1.0.0",
            "docs": "/docs",
            "health": "/api/health",
        }
    )


# ---------------------------------------------------------------------------
# Startup event
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def on_startup():
    logger.info(
        "MatchDay Command API starting up",
    )
    logger.info(f"Firestore mode: {'real' if settings.use_real_firestore else 'in-memory mock'}")
    logger.info(f"Vertex AI: {'enabled' if settings.google_cloud_project else 'disabled (fallback mode)'}")
    logger.info(f"Google Maps: {'enabled' if settings.google_maps_api_key else 'disabled (fallback mode)'}")
