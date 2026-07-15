"""POST /api/route — Route calculation with Maps API + rule-based fallback."""
from __future__ import annotations
import uuid
import logging

from fastapi import APIRouter
from app.models.prediction import (
    RouteRequest,
    RouteResponse,
    WaypointRoute,
    AlternativeRoute,
    TransitData,
)
from app.services.maps import maps_service
from app.utils.rules import generate_fallback_route

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/api/route", response_model=RouteResponse, tags=["Navigation"])
async def calculate_route(request: RouteRequest) -> RouteResponse:
    """
    Calculate an accessible route from start to destination.

    Tries Google Maps Routes API first; falls back to rule-based routing
    if the API is unavailable or returns an error.
    """
    # Attempt Google Maps API — wrap in try/except so any exception falls back gracefully
    maps_result = None
    try:
        maps_result = await maps_service.get_route(
            origin=request.start_location,
            destination=request.destination,
            accessibility_reqs=request.accessibility_requirements,
            route_type=request.preferred_route_type,
        )
    except Exception as exc:
        logger.warning(f"Maps API call raised exception: {exc} — using fallback routing")

    if maps_result:
        source = "maps_api"
        route_data = maps_result
        logger.info(f"Route calculated via Maps API: {request.start_location} -> {request.destination}")
    else:
        source = "fallback_rules"
        route_data = generate_fallback_route(
            origin=request.start_location,
            destination=request.destination,
            accessibility_reqs=request.accessibility_requirements,
            route_type=request.preferred_route_type,
        )
        logger.info(f"Route calculated via fallback rules: {request.start_location} -> {request.destination}")

    primary = WaypointRoute(
        waypoints=route_data["waypoints"],
        distance_meters=route_data["distance_meters"],
        eta_seconds=route_data["eta_seconds"],
        accessibility_notes=route_data["accessibility_notes"],
        carbon_kg_equivalent=route_data.get("carbon_kg_equivalent", 0.0),
    )

    alternatives = [
        AlternativeRoute(
            route_type=alt["route_type"],
            distance_meters=alt["distance_meters"],
            eta_seconds=alt["eta_seconds"],
            predicted_density=alt["predicted_density"],
        )
        for alt in route_data.get("alternatives", [])
    ]

    transit_raw = route_data.get("transit_info", {})
    transit = TransitData(
        metro_station_nearby=transit_raw.get("metro_station_nearby", "Central Transit Hub (150m)"),
        eta_minutes=transit_raw.get("eta_minutes", 8),
        accessibility_features=transit_raw.get("accessibility_features", ["wheelchair_lift"]),
    )

    return RouteResponse(
        route_id=str(uuid.uuid4()),
        primary_route=primary,
        alternatives=alternatives,
        transit_info=transit,
        source=source,
    )
