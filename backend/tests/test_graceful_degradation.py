"""
Graceful degradation tests.
Verifies all endpoints return valid 200 responses when Gemini and Maps API
are mocked to raise exceptions.
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestGracefulDegradationGemini:
    """All endpoints must work when Gemini raises exceptions."""

    @patch("app.services.gemini.GeminiService.triage_incident", new_callable=AsyncMock, return_value=None)
    def test_incident_triage_without_gemini(self, mock_triage):
        """Incident triage falls back to rules when Gemini returns None."""
        response = client.post(
            "/api/incident",
            json={
                "incident_type": "raw_report",
                "raw_report": "Lost child near Gate A",
                "reporter_id": "vol_001",
                "location": "Gate A",
                "language_preferred_response": "en",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["triage"]["category"] == "safety_child"
        assert data["classification"]["ai_source"] == "rules"

    @patch("app.services.gemini.GeminiService.predict_bottleneck", new_callable=AsyncMock, return_value=None)
    def test_predict_without_gemini(self, mock_predict):
        """Predictions fall back to rules when Gemini returns None."""
        response = client.post(
            "/api/predict",
            json={"lookahead_minutes": 20, "language": "en"},
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["predictions"]) > 0
        # All should be rules-based
        for pred in data["predictions"]:
            assert pred["ai_source"] == "rules"

    @patch("app.services.gemini.GeminiService.generate_broadcast_messages", new_callable=AsyncMock, return_value=None)
    def test_broadcast_without_gemini(self, mock_broadcast):
        """Broadcast uses fallback templates when Gemini returns None."""
        response = client.post(
            "/api/broadcast-reroute",
            json={
                "action_id": "reroute_test",
                "affected_gates": ["Gate A"],
                "recommended_alternative_gate": "Gate C",
                "reason": "Test degradation",
                "broadcast_languages": ["en", "es"],
                "urgency": "immediate",
                "route_recalculate": True,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "en" in data["messages_pushed"]
        assert "es" in data["messages_pushed"]
        assert len(data["messages_pushed"]["en"]) > 10

    @patch("app.services.gemini.GeminiService._call_model", return_value=None)
    def test_all_gemini_calls_return_none(self, mock_model):
        """When _call_model returns None, all dependent endpoints still work."""
        # Route
        r1 = client.post("/api/route", json={"start_location": "Gate A", "destination": "Gate C", "accessibility_requirements": [], "preferred_route_type": "fastest", "language": "en"})
        assert r1.status_code == 200

        # Incident
        r2 = client.post("/api/incident", json={"raw_report": "medical emergency", "reporter_id": "v1", "location": "Gate A", "language_preferred_response": "en"})
        assert r2.status_code == 200

        # Predict
        r3 = client.post("/api/predict", json={"lookahead_minutes": 20, "language": "en"})
        assert r3.status_code == 200

        # Broadcast
        r4 = client.post("/api/broadcast-reroute", json={"action_id": "test", "affected_gates": ["Gate A"], "recommended_alternative_gate": "Gate C", "reason": "test", "broadcast_languages": ["en"], "urgency": "advisory", "route_recalculate": False})
        assert r4.status_code == 200


class TestGracefulDegradationMaps:
    """Route endpoint must work when Maps API is unavailable."""

    @patch("app.services.maps.MapsService.get_route", new_callable=AsyncMock, return_value=None)
    def test_route_without_maps_api(self, mock_maps):
        """Route calculation falls back to rules when Maps API returns None."""
        response = client.post(
            "/api/route",
            json={
                "start_location": "Gate A",
                "destination": "Restroom Level 2",
                "accessibility_requirements": ["wheelchair"],
                "preferred_route_type": "accessible",
                "language": "en",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["source"] == "fallback_rules"
        assert len(data["primary_route"]["waypoints"]) >= 2
        assert "wheelchair" in data["primary_route"]["accessibility_notes"].lower() or \
               "accessible" in data["primary_route"]["accessibility_notes"].lower()

    @patch("app.services.maps.MapsService.get_route", new_callable=AsyncMock, side_effect=Exception("Network error"))
    def test_route_maps_exception(self, mock_maps):
        """Route handles Maps API exceptions gracefully."""
        response = client.post(
            "/api/route",
            json={
                "start_location": "Gate B",
                "destination": "Food Court",
                "accessibility_requirements": [],
                "preferred_route_type": "fastest",
                "language": "fr",
            },
        )
        assert response.status_code == 200
        assert response.json()["source"] == "fallback_rules"


class TestAlwaysHealthy:
    """Health endpoint should always return 200 regardless of service status."""

    def test_health_always_200(self):
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_heatmap_always_200(self):
        response = client.get("/api/crowd-heatmap")
        assert response.status_code == 200

    def test_incidents_queue_always_200(self):
        response = client.get("/api/incidents/queue")
        assert response.status_code == 200
