"""
POST /api/incident      — Triage and categorize incident reports
GET  /api/incidents/queue — Live incident triage queue for ops dashboard
"""
from __future__ import annotations
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter
from app.models.incident import (
    IncidentRequest,
    IncidentResponse,
    TriageResult,
    ClassificationInfo,
    IncidentQueue,
    QueuedIncident,
    IncidentSummary,
)
from app.services.gemini import gemini_service
from app.services import firestore as db
from app.utils.rules import (
    classify_incident_by_rules,
    generate_fallback_response_scripts,
    get_default_resources,
    PRIORITY_MAP,
)

router = APIRouter()
logger = logging.getLogger(__name__)

SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


@router.post("/api/incident", response_model=IncidentResponse, tags=["Incidents"])
async def triage_incident(request: IncidentRequest) -> IncidentResponse:
    """
    Triage an incident using Gemini 2.0 Flash, with keyword-based fallback.
    Generates multilingual response scripts and saves to Firestore.
    """
    incident_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    ai_categorized = False
    ai_source = "rules"

    # --- Attempt Gemini triage ---
    gemini_result = await gemini_service.triage_incident(
        raw_report=request.raw_report,
        location=request.location,
        language=request.language_preferred_response,
    )

    if gemini_result:
        category = gemini_result.get("category", "unknown")
        severity = gemini_result.get("severity", "low")
        response_scripts = gemini_result.get("response_scripts", {})
        recommended_resources = gemini_result.get("recommended_resources", [])
        ai_categorized = True
        ai_source = "gemini"
        logger.info(f"Gemini triaged incident {incident_id}: {category}/{severity}")
    else:
        # Rule-based fallback
        category, severity = classify_incident_by_rules(request.raw_report)
        response_scripts = generate_fallback_response_scripts(
            category=category,
            location=request.location,
            raw_report=request.raw_report,
            language=request.language_preferred_response,
        )
        recommended_resources = get_default_resources(category)
        logger.info(f"Rules triaged incident {incident_id}: {category}/{severity}")

    # Determine priority queue position
    existing_incidents = db.get_incidents_queue()
    same_severity_count = sum(
        1 for i in existing_incidents
        if i.get("severity") == severity and i.get("status") not in ("resolved", "escalated")
    )
    priority_position = PRIORITY_MAP.get(severity, 4) + same_severity_count

    # Save incident to Firestore
    incident_record = {
        "incident_id": incident_id,
        "timestamp_created": now,
        "timestamp_updated": now,
        "category": category,
        "severity": severity,
        "raw_report": request.raw_report,
        "reporter_id": request.reporter_id,
        "location": request.location,
        "status": "new",
        "ai_categorized": ai_categorized,
        "ai_source": ai_source,
        "assigned_volunteer_id": None,
        "response_scripts": response_scripts,
        "recommended_resources": recommended_resources,
        "public_broadcast_sent": False,
        "broadcast_languages": [],
        "resolution_notes": None,
        "timestamp_resolved": None,
    }
    db.save_incident(incident_record)

    return IncidentResponse(
        incident_id=incident_id,
        triage=TriageResult(
            category=category,
            severity=severity,
            priority_queue_position=priority_position,
        ),
        classification=ClassificationInfo(
            ai_categorized=ai_categorized,
            ai_source=ai_source,
        ),
        response_scripts=response_scripts,
        recommended_resources=recommended_resources,
    )


@router.get("/api/incidents/queue", response_model=IncidentQueue, tags=["Incidents"])
async def get_incidents_queue() -> IncidentQueue:
    """Retrieve live incident triage queue sorted by severity."""
    incidents_raw = db.get_incidents_queue()
    queued: list[QueuedIncident] = []
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}

    for inc in incidents_raw:
        severity = inc.get("severity", "low")
        if severity in counts:
            counts[severity] += 1

        # Compute time since report
        try:
            created = datetime.fromisoformat(inc["timestamp_created"].replace("Z", "+00:00"))
            delta = datetime.now(timezone.utc) - created
            mins = int(delta.total_seconds() / 60)
            time_since = f"{mins} min ago" if mins > 0 else "just now"
        except Exception:
            time_since = "unknown"

        queued.append(
            QueuedIncident(
                incident_id=inc["incident_id"],
                category=inc.get("category", "unknown"),
                severity=severity,
                time_since_report=time_since,
                location=inc.get("location", "Unknown"),
                status=inc.get("status", "new"),
                assigned_volunteer_id=inc.get("assigned_volunteer_id"),
                next_action=inc.get("response_scripts", {}).get("volunteer_script", "")[:80],
                resolved_at=inc.get("timestamp_resolved"),
            )
        )

    return IncidentQueue(
        timestamp=datetime.now(timezone.utc).isoformat(),
        active_incidents=queued,
        summary=IncidentSummary(
            critical_count=counts["critical"],
            high_count=counts["high"],
            medium_count=counts["medium"],
            low_count=counts["low"],
        ),
    )
