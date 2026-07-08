"""
Firestore abstraction layer.

By default, uses an in-memory mock that mirrors the Firestore data model exactly.
Set USE_REAL_FIRESTORE=true to use real Google Cloud Firestore.
All state persists for the lifetime of the process (ideal for demo/hackathon).
"""
from __future__ import annotations
import uuid
import logging
from datetime import datetime, timezone
from copy import deepcopy

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# In-memory state (module-level, shared across all requests)
# ---------------------------------------------------------------------------

_stadium_state: dict = {
    "timestamp": datetime.now(timezone.utc).isoformat(),
    "avg_occupancy": 0.78,
    "busiest_section": "Section 101 (87%)",
    "metro_delay_minutes": 8,
    "weather_condition": "rain",
    "last_prediction": None,
}

_crowd_signals: list[dict] = []

_incidents: dict[str, dict] = {
    "inc-001": {
        "incident_id": "inc-001",
        "timestamp_created": "2026-06-14T18:32:00Z",
        "timestamp_updated": "2026-06-14T18:33:00Z",
        "category": "safety_child",
        "severity": "critical",
        "raw_report": "Lost child, ~6 years old, red shirt, near Gate A concourse",
        "reporter_id": "volunteer_042",
        "location": "Gate A, Concourse Level 1",
        "status": "in_progress",
        "ai_categorized": True,
        "ai_source": "rules",
        "assigned_volunteer_id": "volunteer_042",
        "response_scripts": {
            "volunteer_script": "Immediate action: Lost child at Gate A Concourse. Check Lost & Found, contact Family Services.",
            "public_broadcast_en": "Attention: A lost child has been reported near Gate A. Please notify staff.",
        },
        "recommended_resources": [
            {"type": "volunteer_role", "role": "family_services", "location": "Gate A Medical Bay", "count_available": 2},
        ],
        "public_broadcast_sent": False,
        "broadcast_languages": [],
        "resolution_notes": None,
        "timestamp_resolved": None,
    },
    "inc-002": {
        "incident_id": "inc-002",
        "timestamp_created": "2026-06-14T18:22:00Z",
        "timestamp_updated": "2026-06-14T18:34:00Z",
        "category": "medical",
        "severity": "high",
        "raw_report": "Fan in Section 205 reports feeling dizzy and needs assistance",
        "reporter_id": "volunteer_015",
        "location": "Section 205, Seating Area",
        "status": "resolved",
        "ai_categorized": True,
        "ai_source": "rules",
        "assigned_volunteer_id": "volunteer_015",
        "response_scripts": {
            "volunteer_script": "Medical assistance needed at Section 205.",
            "public_broadcast_en": "Medical staff are responding near Section 205.",
        },
        "recommended_resources": [],
        "public_broadcast_sent": False,
        "broadcast_languages": [],
        "resolution_notes": "Medical team attended, fan recovered.",
        "timestamp_resolved": "2026-06-14T18:34:00Z",
    },
}

_broadcasts: dict[str, dict] = {}

_zones: list[dict] = [
    {"zone_id": "section_101", "zone_name": "Section 101 (North Upper)", "capacity": 5000, "current_occupancy": 4350, "occupancy_percent": 87.0, "trend": "increasing", "trend_rate": "+2.1% per minute", "color_coding": "red", "recommendation": "Close Entry, Open Exit; Reroute new arrivals"},
    {"zone_id": "section_205", "zone_name": "Section 205 (South Lower)", "capacity": 4200, "current_occupancy": 1764, "occupancy_percent": 42.0, "trend": "stable", "trend_rate": "stable", "color_coding": "green", "recommendation": "Available for overflow"},
    {"zone_id": "gate_a_concourse", "zone_name": "Gate A Concourse", "capacity": 3000, "current_occupancy": 2790, "occupancy_percent": 93.0, "trend": "increasing", "trend_rate": "+3.5% per minute", "color_coding": "red", "recommendation": "Critical — redirect fans to Gate C"},
    {"zone_id": "gate_c_concourse", "zone_name": "Gate C Concourse", "capacity": 3000, "current_occupancy": 1740, "occupancy_percent": 58.0, "trend": "stable", "trend_rate": "stable", "color_coding": "yellow", "recommendation": "Normal flow, monitor for Gate A spillover"},
    {"zone_id": "west_wing", "zone_name": "West Wing", "capacity": 4500, "current_occupancy": 3195, "occupancy_percent": 71.0, "trend": "increasing", "trend_rate": "+1.2% per minute", "color_coding": "yellow", "recommendation": "Monitor closely; approaching moderate threshold"},
    {"zone_id": "east_wing", "zone_name": "East Wing", "capacity": 4000, "current_occupancy": 2600, "occupancy_percent": 65.0, "trend": "stable", "trend_rate": "stable", "color_coding": "green", "recommendation": "Normal operations"},
]

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


def get_stadium_state() -> dict:
    return deepcopy(_stadium_state)


def update_stadium_state(updates: dict) -> None:
    _stadium_state.update(updates)
    _stadium_state["timestamp"] = datetime.now(timezone.utc).isoformat()


def save_crowd_signal(signal: dict) -> None:
    _crowd_signals.append({**signal, "saved_at": datetime.now(timezone.utc).isoformat()})
    # Keep last 500 signals
    if len(_crowd_signals) > 500:
        _crowd_signals.pop(0)


def get_crowd_signals(limit: int = 50) -> list[dict]:
    return deepcopy(_crowd_signals[-limit:])


def save_incident(incident: dict) -> None:
    _incidents[incident["incident_id"]] = deepcopy(incident)


def update_incident(incident_id: str, updates: dict) -> None:
    if incident_id in _incidents:
        _incidents[incident_id].update(updates)
        _incidents[incident_id]["timestamp_updated"] = datetime.now(timezone.utc).isoformat()


def get_incidents_queue() -> list[dict]:
    incidents = list(_incidents.values())
    incidents.sort(key=lambda i: SEVERITY_ORDER.get(i.get("severity", "low"), 3))
    return deepcopy(incidents)


def save_broadcast(broadcast: dict) -> None:
    _broadcasts[broadcast["broadcast_id"]] = deepcopy(broadcast)


def get_active_fan_sessions() -> int:
    """Returns simulated active fan PWA session count."""
    return 8342


def get_zones() -> list[dict]:
    return deepcopy(_zones)


def update_zones(zone_updates: list[dict]) -> None:
    """Update zone occupancy from ingested signals."""
    for update in zone_updates:
        for zone in _zones:
            if zone["zone_id"] == update.get("zone_id"):
                zone.update(update)


def _try_init_real_firestore():
    """Attempt to connect to real Firestore (only when USE_REAL_FIRESTORE=true)."""
    try:
        from google.cloud import firestore  # type: ignore
        client = firestore.Client()
        logger.info("Real Firestore client initialized")
        return client
    except Exception as e:
        logger.warning(f"Real Firestore unavailable, using mock: {e}")
        return None


def get_firestore_client():
    """Returns real Firestore client or None (falls back to mock functions above)."""
    try:
        from app.config import settings
        if settings.use_real_firestore:
            return _try_init_real_firestore()
    except Exception:
        pass
    return None
