"""
Rule-based bottleneck prediction engine.

Produces predictions using occupancy thresholds, metro delays, and weather multipliers.
Used as primary prediction layer and as fallback when Gemini is unavailable.
"""
from __future__ import annotations
import logging

logger = logging.getLogger(__name__)

# Baseline zone data used for predictions
ZONE_DEFINITIONS = [
    {"gate": "Gate A", "current_occupancy": 87, "capacity": 5000, "label": "Gate A Concourse"},
    {"gate": "Gate B", "current_occupancy": 65, "capacity": 4500, "label": "Gate B Concourse"},
    {"gate": "Gate C", "current_occupancy": 42, "capacity": 5000, "label": "Gate C Concourse"},
    {"gate": "Gate D", "current_occupancy": 71, "capacity": 4200, "label": "Gate D Concourse"},
    {"gate": "Gate E", "current_occupancy": 58, "capacity": 3800, "label": "Gate E Concourse"},
    {"gate": "Section 101", "current_occupancy": 87, "capacity": 5000, "label": "Section 101 (North)"},
]

WEATHER_MULTIPLIERS = {
    "rain": 1.18,
    "storm": 1.25,
    "clear": 1.0,
    "cloudy": 1.05,
    "sunny": 0.98,
}

RECOMMENDED_ACTIONS = {
    "high": "Open adjacent gate and broadcast reroute to fans",
    "medium": "Monitor closely; prepare alternate entry messaging",
    "low": "No action required; continue monitoring",
}


def calculate_trend_analysis(signals: list[dict]) -> str:
    """Summarize recent signal trends into a human-readable string."""
    if not signals:
        return "No recent signals; using baseline data."

    occupancy_signals = [s for s in signals if s.get("type") == "occupancy"]
    transit_signals = [s for s in signals if s.get("type") == "transit_delay"]
    weather_signals = [s for s in signals if s.get("type") == "weather"]

    parts = []
    if occupancy_signals:
        avg_occ = sum(s.get("value", 0) for s in occupancy_signals) / len(occupancy_signals)
        parts.append(f"Average occupancy: {avg_occ:.1%}")
    if transit_signals:
        max_delay = max(s.get("value", 0) for s in transit_signals)
        parts.append(f"Metro delay: {max_delay:.0f} min")
    if weather_signals:
        condition = weather_signals[-1].get("condition", "unknown")
        parts.append(f"Weather: {condition}")

    return "; ".join(parts) if parts else "Baseline conditions"


def rule_based_predict(current_state: dict, lookahead_minutes: int = 20) -> list[dict]:
    """
    Generate bottleneck predictions using rule-based logic.

    Algorithm:
      - base_rate_per_minute = 0.6% if metro delayed else 0.3%
      - weather_multiplier from WEATHER_MULTIPLIERS
      - predicted = min(100, current + base_rate * lookahead * multiplier)
      - risk_level: <70 = low, 70-85 = medium, >85 = high
      - time_to_critical: (90 - current) / (base_rate * multiplier) minutes
    """
    metro_delay = current_state.get("metro_delay_minutes", 0)
    weather = current_state.get("weather_condition", "clear")
    weather_multiplier = WEATHER_MULTIPLIERS.get(weather.lower(), 1.0)

    base_rate = 0.6 if metro_delay > 5 else 0.3  # percent per minute

    predictions = []
    for zone in ZONE_DEFINITIONS:
        current = float(zone["current_occupancy"])
        effective_rate = base_rate * weather_multiplier

        predicted = min(100.0, current + effective_rate * lookahead_minutes)
        predicted = round(predicted, 1)

        # Risk level
        if predicted >= 86:
            risk = "high"
        elif predicted >= 70:
            risk = "medium"
        else:
            risk = "low"

        # Time to critical (90%)
        if current >= 90:
            time_to_critical = "Already critical"
        elif effective_rate > 0:
            mins = max(0, (90 - current) / effective_rate)
            if mins <= lookahead_minutes:
                time_to_critical = f"{int(mins)} minutes"
            else:
                time_to_critical = f"{int(mins)}+ minutes"
        else:
            time_to_critical = "N/A"

        # Reason
        reason_parts = []
        if metro_delay > 5:
            reason_parts.append(f"Metro delayed {metro_delay} min")
        if weather_multiplier > 1.05:
            reason_parts.append(f"{weather} driving indoor foot traffic")
        if current > 80:
            reason_parts.append("existing high occupancy")
        reason = " + ".join(reason_parts) if reason_parts else "Baseline crowd flow"

        predictions.append({
            "gate": zone["gate"],
            "current_capacity_percent": current,
            "predicted_capacity_percent": predicted,
            "time_to_critical": time_to_critical,
            "risk_level": risk,
            "reason": reason,
            "recommended_action": RECOMMENDED_ACTIONS[risk],
            "confidence_percent": 92 if risk == "high" else 85,
            "ai_source": "rules",
        })

    # Sort by predicted occupancy descending
    predictions.sort(key=lambda p: p["predicted_capacity_percent"], reverse=True)
    return predictions
