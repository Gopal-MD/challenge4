"""
Rule-based fallback logic for all AI-dependent operations.

Used when Gemini is unavailable or returns invalid responses.
Provides keyword classification, route generation, and broadcast templates.
"""
from __future__ import annotations
import random
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Incident Classification
# ---------------------------------------------------------------------------

KEYWORD_CATEGORIES: dict[str, list[str]] = {
    "safety_child": [
        "lost child", "missing child", "child", "kid", "niño", "enfant", "missing kid",
        "unaccompanied minor", "distressed child",
    ],
    "medical": [
        "injured", "hurt", "medical", "ambulance", "unconscious", "fall", "fell",
        "bleeding", "pain", "ill", "sick", "cardiac", "fainted", "dizzy", "vomiting",
    ],
    "security": [
        "theft", "stolen", "fight", "fighting", "aggressive", "suspicious",
        "security", "violence", "threat", "assault", "weapon",
    ],
    "accessibility": [
        "wheelchair", "accessible", "disability", "disabled", "elevator",
        "ramp", "assistance", "hearing loop", "visual",
    ],
    "logistics": [
        "lost item", "lost bag", "lost phone", "restroom", "toilet", "exit",
        "entrance", "where is", "directions", "food", "water", "seat",
    ],
}

SEVERITY_MAP: dict[str, str] = {
    "safety_child": "critical",
    "medical": "high",
    "security": "high",
    "accessibility": "medium",
    "logistics": "low",
    "unknown": "low",
}

PRIORITY_MAP: dict[str, int] = {
    "critical": 1,
    "high": 2,
    "medium": 3,
    "low": 4,
}

# ---------------------------------------------------------------------------
# Multilingual Broadcast Templates
# ---------------------------------------------------------------------------

FALLBACK_BROADCASTS: dict[str, str] = {
    "en": "{gate} is experiencing high congestion. We recommend using {alternative} instead. Please proceed to {alternative}.",
    "es": "{gate} está experimentando alta congestión. Recomendamos usar {alternative}. Por favor diríjase a {alternative}.",
    "fr": "{gate} connaît une forte congestion. Nous recommandons d'utiliser {alternative}. Veuillez vous rendre à {alternative}.",
    "pt": "{gate} está com alta congestão. Recomendamos usar {alternative}. Por favor, vá para {alternative}.",
    "de": "{gate} ist stark überfüllt. Wir empfehlen, {alternative} zu benutzen. Bitte begeben Sie sich zu {alternative}.",
    "ar": "يشهد {gate} ازدحاماً شديداً. ننصح باستخدام {alternative}. يرجى التوجه إلى {alternative}.",
    "zh": "{gate}目前非常拥挤。我们建议使用{alternative}。请前往{alternative}。",
    "ja": "{gate}は非常に混雑しています。{alternative}の使用をお勧めします。{alternative}にお進みください。",
    "hi": "{gate} में भीड़भाड़ है। हम {alternative} का उपयोग करने की सलाह देते हैं। कृपया {alternative} की ओर जाएं।",
}

# Response script templates per incident category
RESPONSE_SCRIPTS: dict[str, dict[str, str]] = {
    "safety_child": {
        "volunteer_script": (
            "IMMEDIATE ACTION REQUIRED: Lost child reported at {location}. "
            "1) Alert all Gate A staff immediately. "
            "2) Check Lost & Found at Main Concourse. "
            "3) Contact Family Services Bay (Gate A Medical). "
            "4) Do NOT make public announcement yet — await supervisor approval."
        ),
        "public_broadcast_en": (
            "Attention stadium guests: If you see an unaccompanied young child, "
            "please notify the nearest staff member immediately. Thank you for your help."
        ),
        "emergency_broadcast_script": (
            "ESCALATION: Activate Family Services protocol. "
            "Review Gate A camera footage. Prepare medical bay for possible child distress."
        ),
    },
    "medical": {
        "volunteer_script": (
            "Medical assistance needed at {location}. "
            "1) Contact on-site medical team immediately (ext. 911). "
            "2) Keep area clear. 3) Stay with the affected person until help arrives."
        ),
        "public_broadcast_en": (
            "Attention: Stadium medical staff are responding to a situation near {location}. "
            "Please keep the area clear to allow staff access. Thank you."
        ),
        "emergency_broadcast_script": (
            "Dispatch medical team to {location}. Prepare stretcher/AED if needed."
        ),
    },
    "security": {
        "volunteer_script": (
            "Security alert at {location}. "
            "1) Contact security control room immediately. "
            "2) Do not confront. 3) Keep bystanders away. 4) Await security team."
        ),
        "public_broadcast_en": (
            "Attention: Security personnel are responding to an incident near {location}. "
            "Please follow all staff instructions. Thank you for your cooperation."
        ),
        "emergency_broadcast_script": "Activate security protocol. Contact police liaison if needed.",
    },
    "accessibility": {
        "volunteer_script": (
            "Accessibility assistance needed at {location}. "
            "Contact accessibility support team. Provide wheelchair/elevator access as required."
        ),
        "public_broadcast_en": (
            "Stadium accessibility staff are assisting a guest near {location}. "
            "We appreciate your patience."
        ),
        "emergency_broadcast_script": "Deploy accessibility support vehicle if elevator is out of service.",
    },
    "logistics": {
        "volunteer_script": (
            "Fan assistance request at {location}: {report}. "
            "Direct to Information Desk or Lost & Found as appropriate."
        ),
        "public_broadcast_en": (
            "A reminder that the Information Desk is located at the Main Concourse Level 1. "
            "Lost & Found is at Gate B, Level 1."
        ),
        "emergency_broadcast_script": "No escalation needed for logistics incident.",
    },
}

DEFAULT_RESOURCES: dict[str, list[dict]] = {
    "safety_child": [
        {"type": "volunteer_role", "role": "family_services", "location": "Gate A Medical Bay", "count_available": 2},
        {"type": "staff_position", "role": "security", "location": "Gate A Entrance", "count_available": 3},
    ],
    "medical": [
        {"type": "volunteer_role", "role": "medical", "location": "Medical Bay Level 1", "count_available": 2},
        {"type": "staff_position", "role": "operations", "location": "Control Room", "count_available": 1},
    ],
    "security": [
        {"type": "staff_position", "role": "security", "location": "Nearest Gate", "count_available": 4},
        {"type": "volunteer_role", "role": "operations", "location": "Control Room", "count_available": 2},
    ],
    "accessibility": [
        {"type": "volunteer_role", "role": "accessibility_support", "location": "Main Entrance", "count_available": 3},
        {"type": "volunteer_role", "role": "family_services", "location": "Gate B", "count_available": 2},
    ],
    "logistics": [
        {"type": "volunteer_role", "role": "volunteer", "location": "Information Desk", "count_available": 5},
    ],
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def classify_incident_by_rules(raw_report: str) -> tuple[str, str]:
    """
    Classify an incident using keyword matching.
    Returns (category, severity).
    """
    report_lower = raw_report.lower()
    for category, keywords in KEYWORD_CATEGORIES.items():
        if any(kw in report_lower for kw in keywords):
            return category, SEVERITY_MAP[category]
    return "unknown", "low"


def generate_fallback_route(
    origin: str,
    destination: str,
    accessibility_reqs: list[str],
    route_type: str,
) -> dict:
    """Generate a plausible rule-based route without Maps API."""
    base_distance = random.randint(150, 380)
    speed_factor = 1.3 if "wheelchair" in accessibility_reqs else 1.0
    base_eta = int(base_distance * speed_factor)

    # Build accessibility notes
    notes_parts = []
    if "wheelchair" in accessibility_reqs:
        notes_parts.append("Wheelchair accessible via elevator banks")
    if "visual_impairment" in accessibility_reqs:
        notes_parts.append("Tactile guidance strips on floor")
    if "hearing_impairment" in accessibility_reqs:
        notes_parts.append("Visual signage at all decision points")
    if "mobility_limited" in accessibility_reqs:
        notes_parts.append("Low-gradient path selected")
    accessibility_notes = ". ".join(notes_parts) if notes_parts else "Standard accessible path — no steps"

    # Build realistic waypoints
    waypoints = [origin]
    if "Gate" in origin:
        waypoints.append("Concourse Level 1")
    waypoints.append("Main Corridor")
    if "Restroom" in destination or "restroom" in destination.lower():
        waypoints.append("Restroom Wing Signage")
    waypoints.append(destination)

    return {
        "waypoints": waypoints,
        "distance_meters": base_distance,
        "eta_seconds": base_eta,
        "accessibility_notes": accessibility_notes,
        "carbon_kg_equivalent": 0.0,
        "alternatives": [
            {
                "route_type": "least_crowded",
                "distance_meters": base_distance + 65,
                "eta_seconds": base_eta + 85,
                "predicted_density": "low",
            },
            {
                "route_type": "lowest_carbon",
                "distance_meters": base_distance + 25,
                "eta_seconds": base_eta + 35,
                "predicted_density": "medium",
            },
        ],
        "transit_info": {
            "metro_station_nearby": "Central Transit Hub (150m)",
            "eta_minutes": 8,
            "accessibility_features": ["wheelchair_lift", "tactile_guidance", "audio_announcements"],
        },
    }


def generate_fallback_broadcast(
    affected_gates: list[str],
    alternative_gate: str,
    reason: str,
    languages: list[str],
) -> dict[str, str]:
    """Generate broadcast messages using template strings for all requested languages."""
    gate_str = ", ".join(affected_gates)
    messages = {}
    for lang in languages:
        template = FALLBACK_BROADCASTS.get(lang, FALLBACK_BROADCASTS["en"])
        messages[lang] = template.format(gate=gate_str, alternative=alternative_gate)
    return messages


def generate_fallback_response_scripts(
    category: str,
    location: str,
    raw_report: str,
    language: str,
) -> dict[str, str]:
    """Generate response scripts based on category templates."""
    templates = RESPONSE_SCRIPTS.get(category, RESPONSE_SCRIPTS.get("logistics", {}))
    scripts = {}
    for key, template in templates.items():
        scripts[key] = template.format(
            location=location,
            report=raw_report[:100],
        )
    # Add language-specific broadcast (same as EN for fallback)
    if language != "en" and "public_broadcast_en" in scripts:
        scripts[f"public_broadcast_{language}"] = scripts["public_broadcast_en"]
    return scripts


def get_default_resources(category: str) -> list[dict]:
    """Get recommended resources for a given incident category."""
    return DEFAULT_RESOURCES.get(category, DEFAULT_RESOURCES.get("logistics", []))
