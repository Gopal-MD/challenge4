"""Locust load test for MatchDay Command API."""
from locust import HttpUser, task, between
import random
import uuid


class FanUser(HttpUser):
    """Simulates concurrent fan PWA sessions."""
    wait_time = between(2, 5)

    GATES = ["Gate A", "Gate B", "Gate C", "Gate D", "Gate E"]
    DESTINATIONS = ["Restroom Level 1", "Food Court", "Medical Bay", "Family Services", "Exit Gate C"]
    LANGUAGES = ["en", "es", "fr", "pt", "de"]

    @task(3)
    def request_route(self):
        """Fans requesting navigation routes."""
        self.client.post(
            "/api/route",
            json={
                "start_location": random.choice(self.GATES),
                "destination": random.choice(self.DESTINATIONS),
                "accessibility_requirements": random.choice([[], ["wheelchair"], []]),
                "preferred_route_type": random.choice(["fastest", "accessible", "least_crowded"]),
                "language": random.choice(self.LANGUAGES),
            },
            name="/api/route",
        )

    @task(2)
    def request_crowd_heatmap(self):
        """Fans checking stadium occupancy."""
        self.client.get("/api/crowd-heatmap", name="/api/crowd-heatmap")

    @task(1)
    def concierge_chat(self):
        """Fan asking concierge a question."""
        questions = [
            "Where is the nearest restroom?",
            "How do I get to Section 205?",
            "Where is the family area?",
            "I need wheelchair assistance",
        ]
        self.client.post(
            "/api/incident",
            json={
                "incident_type": "raw_report",
                "raw_report": random.choice(questions),
                "reporter_id": f"fan_{uuid.uuid4().hex[:8]}",
                "location": "Fan Request",
                "language_preferred_response": random.choice(self.LANGUAGES),
            },
            name="/api/incident (fan chat)",
        )


class OpsUser(HttpUser):
    """Simulates ops staff using the dashboard."""
    wait_time = between(5, 15)

    @task(3)
    def check_incidents(self):
        """Ops staff checking incident queue."""
        self.client.get("/api/incidents/queue", name="/api/incidents/queue")

    @task(2)
    def check_heatmap(self):
        """Ops staff viewing crowd heatmap."""
        self.client.get("/api/crowd-heatmap", name="/api/crowd-heatmap")

    @task(1)
    def predict_bottlenecks(self):
        """Ops staff running bottleneck predictions."""
        self.client.post(
            "/api/predict",
            json={"lookahead_minutes": 20, "language": "en"},
            name="/api/predict",
        )

    @task(1)
    def send_broadcast(self):
        """Ops staff sending a reroute broadcast."""
        self.client.post(
            "/api/broadcast-reroute",
            json={
                "action_id": f"reroute_{random.randint(1000, 9999)}",
                "affected_gates": random.choice([["Gate A"], ["Gate A", "Gate B"]]),
                "recommended_alternative_gate": random.choice(["Gate C", "Gate D", "Gate E"]),
                "reason": "High congestion detected",
                "broadcast_languages": ["en", "es", "fr"],
                "urgency": random.choice(["immediate", "elevated", "advisory"]),
                "route_recalculate": True,
            },
            name="/api/broadcast-reroute",
        )

    @task(1)
    def ingest_crowd_signal(self):
        """Simulated sensor data ingestion."""
        self.client.post(
            "/api/crowd-signal",
            json={
                "timestamp": "2026-06-14T18:30:00Z",
                "signals": [
                    {
                        "sensor_id": f"section_{random.randint(100, 210)}",
                        "type": "occupancy",
                        "value": round(random.uniform(0.4, 0.98), 2),
                        "unit": "capacity_fraction",
                        "location": f"Section {random.randint(100, 210)}",
                    }
                ],
            },
            name="/api/crowd-signal",
        )


# Run with:
# locust -f load_tests/locustfile.py --host=http://localhost:8080 -u 8000 -r 100 --headless -t 120s
