"""Pydantic models for predictions, routes, and broadcasts."""
from __future__ import annotations
from pydantic import BaseModel


class PredictRequest(BaseModel):
    lookahead_minutes: int = 20
    language: str = "en"


class PredictionItem(BaseModel):
    gate: str
    current_capacity_percent: float
    predicted_capacity_percent: float
    time_to_critical: str
    risk_level: str  # low | medium | high
    reason: str
    recommended_action: str
    confidence_percent: int
    ai_source: str  # gemini | rules


class PredictionResponse(BaseModel):
    predictions: list[PredictionItem]


class RouteRequest(BaseModel):
    start_location: str
    destination: str
    accessibility_requirements: list[str] = []
    preferred_route_type: str = "fastest"
    language: str = "en"


class WaypointRoute(BaseModel):
    waypoints: list[str]
    distance_meters: int
    eta_seconds: int
    accessibility_notes: str
    carbon_kg_equivalent: float


class AlternativeRoute(BaseModel):
    route_type: str
    distance_meters: int
    eta_seconds: int
    predicted_density: str


class TransitData(BaseModel):
    metro_station_nearby: str
    eta_minutes: int
    accessibility_features: list[str]


class RouteResponse(BaseModel):
    route_id: str
    primary_route: WaypointRoute
    alternatives: list[AlternativeRoute]
    transit_info: TransitData
    source: str  # maps_api | fallback_rules


class BroadcastRequest(BaseModel):
    action_id: str
    affected_gates: list[str]
    recommended_alternative_gate: str
    reason: str
    broadcast_languages: list[str] = ["en"]
    urgency: str = "immediate"
    route_recalculate: bool = True


class BroadcastResponse(BaseModel):
    broadcast_id: str
    status: str
    target_fan_sessions: int
    delivered_count: int
    failed_count: int
    messages_pushed: dict[str, str]
    aria_live_announcements: bool
    screen_reader_compatible: bool
