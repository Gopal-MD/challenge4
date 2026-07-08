"""Pydantic models for incident triage and response."""
from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


class IncidentRequest(BaseModel):
    incident_type: str = "raw_report"
    raw_report: str
    reporter_id: str
    location: str
    language_preferred_response: str = "en"


class TriageResult(BaseModel):
    category: str  # safety_child | medical | security | accessibility | logistics | unknown
    severity: str  # critical | high | medium | low
    priority_queue_position: int


class ClassificationInfo(BaseModel):
    ai_categorized: bool
    ai_source: str  # gemini | rules


class IncidentResponse(BaseModel):
    incident_id: str
    triage: TriageResult
    classification: ClassificationInfo
    response_scripts: dict[str, str]
    recommended_resources: list[dict]


class QueuedIncident(BaseModel):
    incident_id: str
    category: str
    severity: str
    time_since_report: str
    location: str
    status: str  # new | in_progress | resolved | escalated
    assigned_volunteer_id: Optional[str] = None
    next_action: Optional[str] = None
    resolved_at: Optional[str] = None


class IncidentSummary(BaseModel):
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int


class IncidentQueue(BaseModel):
    timestamp: str
    active_incidents: list[QueuedIncident]
    summary: IncidentSummary
