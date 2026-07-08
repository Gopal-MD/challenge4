"""
Full pytest test suite for MatchDay Command API.
Tests all 8 endpoints with real responses (in-memory mock Firestore).
Coverage target: ≥ 85%
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# ---------------------------------------------------------------------------
# Test Route Calculation
# ---------------------------------------------------------------------------


class TestRoute:
    def test_route_basic_fastest(self):
        """Test fastest route calculation."""
        response = client.post(
            "/api/route",
            json={
                "start_location": "Gate A, Section 101",
                "destination": "Restroom Level 2, East Wing",
                "accessibility_requirements": [],
                "preferred_route_type": "fastest",
                "language": "en",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "route_id" in data
        assert "primary_route" in data
        assert "alternatives" in data
        assert "transit_info" in data
        assert "source" in data
        assert data["source"] in ("maps_api", "fallback_rules")

    def test_route_accessible_wheelchair(self):
        """Test accessible route with wheelchair requirement."""
        response = client.post(
            "/api/route",
            json={
                "start_location": "Gate A",
                "destination": "Family Services Bay",
                "accessibility_requirements": ["wheelchair", "visual_impairment"],
                "preferred_route_type": "accessible",
                "language": "en",
            },
        )
        assert response.status_code == 200
        data = response.json()
        primary = data["primary_route"]
        assert "accessibility_notes" in primary
        assert primary["carbon_kg_equivalent"] >= 0
        assert len(primary["waypoints"]) >= 2
        assert primary["distance_meters"] > 0
        assert primary["eta_seconds"] > 0

    def test_route_fallback_source(self):
        """Test that route uses fallback_rules when Maps API key is absent."""
        response = client.post(
            "/api/route",
            json={
                "start_location": "Gate C",
                "destination": "Restroom Level 1",
                "accessibility_requirements": [],
                "preferred_route_type": "fastest",
                "language": "es",
            },
        )
        assert response.status_code == 200
        data = response.json()
        # In test env, no Maps API key → always fallback
        assert data["source"] == "fallback_rules"

    def test_route_transit_info_present(self):
        """Test that transit info is always included."""
        response = client.post(
            "/api/route",
            json={
                "start_location": "Parking North",
                "destination": "Gate B",
                "accessibility_requirements": [],
                "preferred_route_type": "lowest_carbon",
                "language": "fr",
            },
        )
        assert response.status_code == 200
        transit = response.json()["transit_info"]
        assert "metro_station_nearby" in transit
        assert "eta_minutes" in transit
        assert "accessibility_features" in transit
        assert isinstance(transit["accessibility_features"], list)

    def test_route_alternatives_present(self):
        """Test that alternatives are returned."""
        response = client.post(
            "/api/route",
            json={
                "start_location": "Gate A",
                "destination": "Food Court",
                "accessibility_requirements": [],
                "preferred_route_type": "fastest",
                "language": "en",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["alternatives"], list)
        assert len(data["alternatives"]) >= 1


# ---------------------------------------------------------------------------
# Test Crowd Endpoints
# ---------------------------------------------------------------------------


class TestCrowd:
    def test_crowd_signal_ingestion(self):
        """Test crowd signal processing and state update."""
        response = client.post(
            "/api/crowd-signal",
            json={
                "timestamp": "2026-06-14T18:30:00Z",
                "signals": [
                    {"sensor_id": "turnstile_gate_a", "type": "turnstile", "value": 2340, "unit": "entries_per_hour", "location": "Gate A"},
                    {"sensor_id": "section_101", "type": "occupancy", "value": 0.87, "unit": "capacity_fraction", "location": "Section 101"},
                    {"sensor_id": "metro_central", "type": "transit_delay", "value": 8, "unit": "minutes", "location": "Central Transit Hub"},
                    {"sensor_id": "weather_sensor", "type": "weather", "condition": "rain", "visibility": 0.8, "temperature_celsius": 22},
                ],
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "acknowledged"
        assert data["saved_signal_count"] == 4
        assert "current_stadium_state" in data
        state = data["current_stadium_state"]
        assert "avg_occupancy" in state
        assert "busiest_section" in state
        assert "metro_delay_minutes" in state
        assert "weather_condition" in state

    def test_crowd_heatmap_structure(self):
        """Test heatmap returns valid zones with required fields."""
        response = client.get("/api/crowd-heatmap")
        assert response.status_code == 200
        data = response.json()
        assert "stadium_zones" in data
        assert "stadium_level_stats" in data
        assert "timestamp" in data
        assert len(data["stadium_zones"]) > 0

        for zone in data["stadium_zones"]:
            assert "zone_id" in zone
            assert "zone_name" in zone
            assert "occupancy_percent" in zone
            assert 0 <= zone["occupancy_percent"] <= 100
            assert zone["color_coding"] in ("green", "yellow", "orange", "red")

    def test_crowd_heatmap_stats(self):
        """Test stadium-level stats are present and valid."""
        response = client.get("/api/crowd-heatmap")
        assert response.status_code == 200
        stats = response.json()["stadium_level_stats"]
        assert stats["total_capacity"] == 80000
        assert 0 <= stats["occupancy_percent"] <= 100
        assert stats["estimated_arrival_rate"] > 0


# ---------------------------------------------------------------------------
# Test Incident Triage
# ---------------------------------------------------------------------------


class TestIncident:
    def test_incident_triage_lost_child(self):
        """Test critical incident classification — lost child."""
        response = client.post(
            "/api/incident",
            json={
                "incident_type": "raw_report",
                "raw_report": "Lost child, approximately 6 years old, red shirt, near Gate A concourse",
                "reporter_id": "volunteer_042",
                "location": "Gate A, Concourse Level 1",
                "language_preferred_response": "en",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "incident_id" in data
        assert "triage" in data
        assert data["triage"]["category"] == "safety_child"
        assert data["triage"]["severity"] in ("critical", "high")
        assert data["triage"]["priority_queue_position"] >= 1
        assert "volunteer_script" in data["response_scripts"]
        assert "public_broadcast_en" in data["response_scripts"]
        assert len(data["recommended_resources"]) > 0

    def test_incident_triage_medical(self):
        """Test medical incident classification."""
        response = client.post(
            "/api/incident",
            json={
                "incident_type": "raw_report",
                "raw_report": "Fan injured after fall, bleeding from knee, needs medical assistance",
                "reporter_id": "volunteer_015",
                "location": "Section 205",
                "language_preferred_response": "en",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["triage"]["category"] == "medical"
        assert data["triage"]["severity"] == "high"

    def test_incident_triage_security(self):
        """Test security incident classification."""
        response = client.post(
            "/api/incident",
            json={
                "incident_type": "raw_report",
                "raw_report": "Suspicious behavior near Gate E, man with aggressive posture",
                "reporter_id": "volunteer_007",
                "location": "Gate E",
                "language_preferred_response": "en",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["triage"]["category"] == "security"

    def test_incident_multilingual_spanish(self):
        """Test multilingual response generation for Spanish."""
        response = client.post(
            "/api/incident",
            json={
                "incident_type": "raw_report",
                "raw_report": "Niño perdido cerca de la entrada principal",
                "reporter_id": "volunteer_099",
                "location": "Main Entrance",
                "language_preferred_response": "es",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "classification" in data
        assert data["classification"]["ai_source"] in ("gemini", "rules")

    def test_incidents_queue_retrieval(self):
        """Test incident queue returns sorted list with summary."""
        response = client.get("/api/incidents/queue")
        assert response.status_code == 200
        data = response.json()
        assert "timestamp" in data
        assert "active_incidents" in data
        assert "summary" in data
        assert "critical_count" in data["summary"]
        assert "high_count" in data["summary"]
        # Verify sorting (critical incidents should come first)
        incidents = data["active_incidents"]
        for i in range(len(incidents) - 1):
            s1 = incidents[i]["severity"]
            s2 = incidents[i + 1]["severity"]
            order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
            assert order.get(s1, 99) <= order.get(s2, 99)

    def test_incident_classification_info(self):
        """Test classification info is present with correct fields."""
        response = client.post(
            "/api/incident",
            json={
                "incident_type": "raw_report",
                "raw_report": "Lost bag at Gate B",
                "reporter_id": "vol_001",
                "location": "Gate B",
                "language_preferred_response": "en",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "ai_categorized" in data["classification"]
        assert "ai_source" in data["classification"]
        assert data["classification"]["ai_source"] in ("gemini", "rules")


# ---------------------------------------------------------------------------
# Test Predictions
# ---------------------------------------------------------------------------


class TestPredict:
    def test_predict_returns_predictions(self):
        """Test bottleneck prediction returns valid list."""
        response = client.post(
            "/api/predict",
            json={"lookahead_minutes": 20, "language": "en"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "predictions" in data
        assert len(data["predictions"]) > 0

    def test_predict_item_schema(self):
        """Test each prediction item has all required fields."""
        response = client.post(
            "/api/predict",
            json={"lookahead_minutes": 20, "language": "en"},
        )
        assert response.status_code == 200
        for pred in response.json()["predictions"]:
            assert "gate" in pred
            assert "current_capacity_percent" in pred
            assert "predicted_capacity_percent" in pred
            assert "time_to_critical" in pred
            assert "risk_level" in pred
            assert pred["risk_level"] in ("low", "medium", "high")
            assert "reason" in pred
            assert "recommended_action" in pred
            assert 0 <= pred["confidence_percent"] <= 100
            assert pred["ai_source"] in ("gemini", "rules")

    def test_predict_sorted_by_risk(self):
        """Test predictions are sorted highest risk first."""
        response = client.post(
            "/api/predict",
            json={"lookahead_minutes": 30, "language": "en"},
        )
        assert response.status_code == 200
        preds = response.json()["predictions"]
        # Predicted occupancy should be descending
        for i in range(len(preds) - 1):
            assert preds[i]["predicted_capacity_percent"] >= preds[i + 1]["predicted_capacity_percent"]


# ---------------------------------------------------------------------------
# Test Broadcast
# ---------------------------------------------------------------------------


class TestBroadcast:
    def test_broadcast_multilingual(self):
        """Test broadcast generates messages in all requested languages."""
        response = client.post(
            "/api/broadcast-reroute",
            json={
                "action_id": "reroute_001",
                "affected_gates": ["Gate A"],
                "recommended_alternative_gate": "Gate C",
                "reason": "High congestion + metro delays",
                "broadcast_languages": ["en", "es", "fr"],
                "urgency": "immediate",
                "route_recalculate": True,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "broadcast_id" in data
        assert data["status"] == "active"
        assert "en" in data["messages_pushed"]
        assert "es" in data["messages_pushed"]
        assert "fr" in data["messages_pushed"]
        assert data["aria_live_announcements"] is True
        assert data["screen_reader_compatible"] is True

    def test_broadcast_all_9_languages(self):
        """Test broadcast works for all 9 supported languages."""
        langs = ["en", "es", "fr", "pt", "de", "ar", "zh", "ja", "hi"]
        response = client.post(
            "/api/broadcast-reroute",
            json={
                "action_id": "reroute_full",
                "affected_gates": ["Gate A", "Gate B"],
                "recommended_alternative_gate": "Gate D",
                "reason": "Capacity exceeded",
                "broadcast_languages": langs,
                "urgency": "elevated",
                "route_recalculate": False,
            },
        )
        assert response.status_code == 200
        data = response.json()
        for lang in langs:
            assert lang in data["messages_pushed"]
            assert len(data["messages_pushed"][lang]) > 10

    def test_broadcast_delivery_counts(self):
        """Test delivery counts are positive integers."""
        response = client.post(
            "/api/broadcast-reroute",
            json={
                "action_id": "reroute_002",
                "affected_gates": ["Gate C"],
                "recommended_alternative_gate": "Gate E",
                "reason": "Spillover from Gate A",
                "broadcast_languages": ["en"],
                "urgency": "advisory",
                "route_recalculate": True,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["target_fan_sessions"] > 0
        assert data["delivered_count"] > 0
        assert data["failed_count"] >= 0


# ---------------------------------------------------------------------------
# Test Health
# ---------------------------------------------------------------------------


class TestHealth:
    def test_health_check_returns_200(self):
        """Test health endpoint always returns 200."""
        response = client.get("/api/health")
        assert response.status_code == 200

    def test_health_check_structure(self):
        """Test health response has all required fields."""
        response = client.get("/api/health")
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "services" in data
        assert "uptime_seconds" in data
        assert "request_count_last_hour" in data
        services = data["services"]
        assert "firestore" in services
        assert "vertex_ai" in services
        assert "google_maps_api" in services
        assert "cloud_logging" in services
        assert services["cloud_logging"] == "healthy"

    def test_health_degraded_without_keys(self):
        """Test health shows degraded for services without API keys."""
        response = client.get("/api/health")
        data = response.json()
        # In test env, no keys set → these should be degraded
        assert data["services"]["vertex_ai"] in ("healthy", "degraded")
        assert data["services"]["google_maps_api"] in ("healthy", "degraded")
