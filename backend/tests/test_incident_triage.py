"""
Deep tests for the incident classification rules engine.
Tests all 6 categories, severity mapping, edge cases.
"""
import pytest
from app.utils.rules import (
    classify_incident_by_rules,
    generate_fallback_route,
    generate_fallback_broadcast,
    generate_fallback_response_scripts,
    get_default_resources,
    SEVERITY_MAP,
    PRIORITY_MAP,
)


class TestKeywordClassification:
    """Tests for rule-based incident classification."""

    def test_lost_child_english(self):
        category, severity = classify_incident_by_rules("Lost child near Gate A, red shirt")
        assert category == "safety_child"
        assert severity == "critical"

    def test_lost_child_keyword_child(self):
        category, severity = classify_incident_by_rules("There is a child here wandering alone")
        assert category == "safety_child"

    def test_lost_child_spanish(self):
        category, severity = classify_incident_by_rules("Un niño perdido cerca de la entrada")
        assert category == "safety_child"
        assert severity == "critical"

    def test_medical_injured(self):
        category, severity = classify_incident_by_rules("Fan injured, fell down the stairs, needs help")
        assert category == "medical"
        assert severity == "high"

    def test_medical_bleeding(self):
        category, severity = classify_incident_by_rules("Person bleeding from forehead at Section 205")
        assert category == "medical"
        assert severity == "high"

    def test_medical_unconscious(self):
        category, severity = classify_incident_by_rules("Someone is unconscious in Section 101")
        assert category == "medical"
        assert severity == "high"

    def test_security_theft(self):
        category, severity = classify_incident_by_rules("My wallet was stolen near Gate B")
        assert category == "security"
        assert severity == "high"

    def test_security_fight(self):
        category, severity = classify_incident_by_rules("There is a fight breaking out at West Wing")
        assert category == "security"
        assert severity == "high"

    def test_accessibility_wheelchair(self):
        category, severity = classify_incident_by_rules("The elevator is broken and a wheelchair user needs assistance")
        assert category == "accessibility"
        assert severity == "medium"

    def test_logistics_restroom(self):
        category, severity = classify_incident_by_rules("Where is the nearest restroom from Gate C?")
        assert category == "logistics"
        assert severity == "low"

    def test_logistics_lost_bag(self):
        category, severity = classify_incident_by_rules("I lost my bag somewhere near the food area")
        assert category == "logistics"
        assert severity == "low"

    def test_unknown_category(self):
        category, severity = classify_incident_by_rules("xyz123 unrecognized report text")
        assert category == "unknown"
        assert severity == "low"

    def test_empty_report(self):
        category, severity = classify_incident_by_rules("")
        assert category == "unknown"
        assert severity == "low"

    def test_very_long_report(self):
        long_report = "injured " * 200
        category, severity = classify_incident_by_rules(long_report)
        assert category == "medical"

    def test_case_insensitive_matching(self):
        category1, _ = classify_incident_by_rules("LOST CHILD at Gate A")
        category2, _ = classify_incident_by_rules("lost child at Gate A")
        assert category1 == category2 == "safety_child"


class TestSeverityMapping:
    """Verify severity map is complete and correct."""

    def test_all_categories_have_severity(self):
        categories = ["safety_child", "medical", "security", "accessibility", "logistics", "unknown"]
        for cat in categories:
            assert cat in SEVERITY_MAP
            assert SEVERITY_MAP[cat] in ("critical", "high", "medium", "low")

    def test_critical_categories(self):
        assert SEVERITY_MAP["safety_child"] == "critical"

    def test_high_categories(self):
        assert SEVERITY_MAP["medical"] == "high"
        assert SEVERITY_MAP["security"] == "high"

    def test_priority_ordering(self):
        assert PRIORITY_MAP["critical"] < PRIORITY_MAP["high"]
        assert PRIORITY_MAP["high"] < PRIORITY_MAP["medium"]
        assert PRIORITY_MAP["medium"] < PRIORITY_MAP["low"]


class TestFallbackRoute:
    """Tests for rule-based route generation."""

    def test_route_has_required_fields(self):
        route = generate_fallback_route("Gate A", "Restroom L1", [], "fastest")
        assert "waypoints" in route
        assert "distance_meters" in route
        assert "eta_seconds" in route
        assert "accessibility_notes" in route
        assert "carbon_kg_equivalent" in route
        assert "alternatives" in route
        assert "transit_info" in route

    def test_route_waypoints_include_origin_dest(self):
        route = generate_fallback_route("Gate A", "Food Court", [], "fastest")
        waypoints = route["waypoints"]
        assert waypoints[0] == "Gate A"
        assert waypoints[-1] == "Food Court"
        assert len(waypoints) >= 2

    def test_route_wheelchair_notes(self):
        route = generate_fallback_route("Gate B", "Restroom L2", ["wheelchair"], "accessible")
        assert "wheelchair" in route["accessibility_notes"].lower() or "accessible" in route["accessibility_notes"].lower()

    def test_route_carbon_zero(self):
        route = generate_fallback_route("Gate A", "Gate C", [], "lowest_carbon")
        assert route["carbon_kg_equivalent"] == 0.0

    def test_route_positive_distance_eta(self):
        route = generate_fallback_route("Section 101", "Exit Gate A", [], "fastest")
        assert route["distance_meters"] > 0
        assert route["eta_seconds"] > 0

    def test_route_alternatives_count(self):
        route = generate_fallback_route("Gate A", "Gate C", [], "fastest")
        assert len(route["alternatives"]) >= 1


class TestFallbackBroadcast:
    """Tests for multilingual broadcast template generation."""

    def test_all_9_languages(self):
        langs = ["en", "es", "fr", "pt", "de", "ar", "zh", "ja", "hi"]
        messages = generate_fallback_broadcast(["Gate A"], "Gate C", "congestion", langs)
        for lang in langs:
            assert lang in messages
            assert "Gate A" in messages[lang] or "gate" in messages[lang].lower() or messages[lang]
            assert len(messages[lang]) > 10

    def test_message_contains_alternative(self):
        messages = generate_fallback_broadcast(["Gate A"], "Gate C", "High crowd", ["en"])
        assert "Gate C" in messages["en"]

    def test_multiple_affected_gates(self):
        messages = generate_fallback_broadcast(["Gate A", "Gate B"], "Gate D", "overflow", ["en"])
        msg = messages["en"]
        assert "Gate A" in msg or "Gate B" in msg


class TestFallbackResponseScripts:
    """Tests for incident response script generation."""

    def test_safety_child_scripts(self):
        scripts = generate_fallback_response_scripts("safety_child", "Gate A", "Lost child 6yo red shirt", "en")
        assert "volunteer_script" in scripts
        assert "public_broadcast_en" in scripts

    def test_medical_scripts(self):
        scripts = generate_fallback_response_scripts("medical", "Section 205", "Injured fan", "en")
        assert "volunteer_script" in scripts
        assert "public_broadcast_en" in scripts

    def test_language_specific_script(self):
        scripts = generate_fallback_response_scripts("logistics", "Gate B", "Lost bag", "es")
        assert "public_broadcast_es" in scripts


class TestDefaultResources:
    def test_safety_child_resources(self):
        resources = get_default_resources("safety_child")
        assert len(resources) > 0
        roles = [r["role"] for r in resources]
        assert "family_services" in roles

    def test_medical_resources(self):
        resources = get_default_resources("medical")
        assert len(resources) > 0

    def test_unknown_category_resources(self):
        resources = get_default_resources("unknown")
        assert isinstance(resources, list)
