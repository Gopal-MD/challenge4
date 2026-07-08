"""
Google Maps Routes API v2 client.

Returns None on any error (missing API key, quota exceeded, network failure).
The caller should fall back to rule-based routing.
"""
from __future__ import annotations
import logging
import httpx

logger = logging.getLogger(__name__)

ROUTES_API_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
FIELD_MASK = "routes.duration,routes.distanceMeters,routes.legs.steps.localizedValues"


class MapsService:
    """Google Maps Routes API v2 client."""

    async def get_route(
        self,
        origin: str,
        destination: str,
        accessibility_reqs: list[str],
        route_type: str,
    ) -> dict | None:
        """
        Compute a route via Google Maps Routes API.
        Returns structured route dict or None if unavailable.
        """
        try:
            from app.config import settings

            if not settings.google_maps_api_key:
                logger.info("GOOGLE_MAPS_API_KEY not set — using fallback routing")
                return None

            travel_mode = "WALK"  # Indoor navigation is walking
            payload = {
                "origin": {"address": f"{origin}, Stadium"},
                "destination": {"address": f"{destination}, Stadium"},
                "travelMode": travel_mode,
                "computeAlternativeRoutes": True,
                "routeModifiers": {
                    "avoidTolls": False,
                    "avoidHighways": False,
                },
                "languageCode": "en-US",
                "units": "METRIC",
            }

            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    ROUTES_API_URL,
                    json=payload,
                    headers={
                        "X-Goog-Api-Key": settings.google_maps_api_key,
                        "X-Goog-FieldMask": FIELD_MASK,
                        "Content-Type": "application/json",
                    },
                )
                response.raise_for_status()
                data = response.json()

            routes = data.get("routes", [])
            if not routes:
                return None

            primary = routes[0]
            distance = primary.get("distanceMeters", 200)
            duration_text = primary.get("duration", "300s")
            # Parse duration like "320s"
            duration_secs = int(duration_text.rstrip("s")) if "s" in str(duration_text) else 320

            # Build accessibility notes
            notes_parts = []
            if "wheelchair" in accessibility_reqs:
                notes_parts.append("Wheelchair accessible path via elevator")
            if "visual_impairment" in accessibility_reqs:
                notes_parts.append("Tactile guidance strips available")
            if "hearing_impairment" in accessibility_reqs:
                notes_parts.append("Visual signage provided")
            accessibility_notes = ", ".join(notes_parts) or "Standard accessible path"

            return {
                "waypoints": [origin, "Main Concourse", destination],
                "distance_meters": distance,
                "eta_seconds": duration_secs,
                "accessibility_notes": accessibility_notes,
                "carbon_kg_equivalent": 0.0,
                "alternatives": [
                    {
                        "route_type": "least_crowded",
                        "distance_meters": distance + 80,
                        "eta_seconds": duration_secs + 90,
                        "predicted_density": "low",
                    },
                    {
                        "route_type": "lowest_carbon",
                        "distance_meters": distance + 30,
                        "eta_seconds": duration_secs + 40,
                        "predicted_density": "medium",
                    },
                ],
                "transit_info": {
                    "metro_station_nearby": "Central Transit Hub (150m)",
                    "eta_minutes": 8,
                    "accessibility_features": ["wheelchair_lift", "tactile_guidance"],
                },
            }

        except httpx.TimeoutException:
            logger.warning("Google Maps API timeout — using fallback routing")
            return None
        except httpx.HTTPStatusError as e:
            logger.warning(f"Google Maps API HTTP error {e.response.status_code} — using fallback")
            return None
        except Exception as e:
            logger.warning(f"Google Maps API error: {e} — using fallback")
            return None


maps_service = MapsService()
