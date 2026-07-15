"""
Vertex AI Gemini 2.0 Flash wrapper.

Every public method catches ALL exceptions and returns None on failure,
enabling full graceful degradation to rule-based fallbacks.

All public methods are async so routes can await them correctly.
"""
from __future__ import annotations
import json
import logging
import re

logger = logging.getLogger(__name__)

# Incident triage prompt matching the spec exactly
TRIAGE_PROMPT_TEMPLATE = """You are an expert emergency incident classifier for a 2026 FIFA World Cup stadium with 80,000 spectators.

Raw Report: "{raw_report}"
Location: {location}
Language: {language_code}

Your task:
1. Classify the incident into ONE category:
   - safety_child: lost or distressed child
   - medical: injury, illness, medical emergency
   - security: theft, suspicious behavior, violence
   - accessibility: accessibility barrier, equipment needed
   - logistics: lost item, wayfinding, crowd issue
   - unknown: cannot classify

2. Assign severity:
   - critical: immediate threat to life or safety
   - high: urgent assistance needed, but not life-threatening
   - medium: important but not urgent
   - low: informational or minor complaint

3. Generate response scripts in {language_code} + English:
   - volunteer_script: clear action steps for staff
   - public_broadcast_en: suitable for stadium PA announcement
   - public_broadcast_{language_code}: same message in {language_code}

4. Recommend 2-3 resources: volunteer role + location, staff position

Return ONLY valid JSON (no markdown, no preamble):
{{
  "category": "...",
  "severity": "...",
  "response_scripts": {{
    "volunteer_script": "...",
    "public_broadcast_en": "...",
    "public_broadcast_{language_code}": "..."
  }},
  "recommended_resources": [
    {{"type": "volunteer_role", "role": "...", "location": "...", "count_available": 2}}
  ]
}}"""

PREDICT_PROMPT_TEMPLATE = """You are a stadium operations AI for 2026 FIFA World Cup. Analyze current conditions and predict congestion for the next {lookahead_minutes} minutes.

Current Stadium State:
{current_state_json}

Recent Trend: {trend_analysis}
Weather: {weather_condition}
Metro Delays: {metro_delay_minutes} min
Match Status: Pre-match (60 min to kickoff)

For each gate/zone with occupancy > 60%, provide a prediction.

Return ONLY valid JSON:
{{
  "predictions": [
    {{
      "gate": "Gate A",
      "predicted_occupancy_percent": 96,
      "time_to_critical": "18 minutes",
      "reason": "Metro delayed 8min + heavy rain driving indoor foot traffic",
      "recommended_action": "Open Gate C and broadcast reroute to fans",
      "confidence_percent": 87
    }}
  ]
}}"""

BROADCAST_PROMPT_TEMPLATE = """You are a multilingual stadium communications specialist.

Generate a clear, concise reroute announcement in these languages: {languages_list}

Gates Affected: {affected_gates}
Reason: {reason}
Recommended Alternative: {alternative_gate}
Urgency: {urgency}

Each message must:
- Be 25 words or fewer (stadium PA readability)
- Mention the problem, solution, and alternative clearly
- Be friendly and reassuring (not panicked)
- Include a call to action (e.g., "Please proceed to Gate C")

Return ONLY valid JSON with language codes as keys:
{{
  "en": "Gate A is congested. Please use Gate C instead.",
  "es": "...",
  ...
}}"""


class GeminiService:
    """Vertex AI Gemini wrapper with full graceful degradation."""

    def __init__(self):
        self._model = None
        self._initialized = False

    def _get_model(self):
        """Lazy-initialize Gemini model. Returns None if unavailable."""
        if self._initialized:
            return self._model
        self._initialized = True
        try:
            import google.generativeai as genai  # type: ignore
            from app.config import settings

            if not settings.gemini_api_key:
                logger.info("GEMINI_API_KEY not set — Gemini disabled, using rule-based fallback")
                return None

            genai.configure(api_key=settings.gemini_api_key)
            self._model = genai.GenerativeModel("gemini-flash-latest")
            logger.info("Gemini Flash Latest initialized successfully via Google AI Studio")
        except Exception as e:
            logger.warning(f"Gemini initialization failed: {e}. All AI calls will use fallback.")
            self._model = None
        return self._model

    def _call_model(self, prompt: str) -> str | None:
        """Call Gemini synchronously and return raw text, or None on any error."""
        try:
            model = self._get_model()
            if model is None:
                return None
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.warning(f"Gemini call failed: {e}")
            return None

    def _parse_json(self, text: str) -> dict | list | None:
        """Parse JSON from Gemini response, stripping markdown fences if present."""
        try:
            # Strip ```json ... ``` fences
            cleaned = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("```").strip()
            return json.loads(cleaned)
        except Exception as e:
            logger.warning(f"Failed to parse Gemini JSON response: {e}. Raw: {text[:200]}")
            return None

    # ------------------------------------------------------------------ #
    # Public async methods — routes use `await` on these
    # ------------------------------------------------------------------ #

    async def triage_incident(self, raw_report: str, location: str, language: str) -> dict | None:
        """Triage an incident using Gemini. Returns dict with category/severity/scripts or None."""
        prompt = TRIAGE_PROMPT_TEMPLATE.format(
            raw_report=raw_report,
            location=location,
            language_code=language,
        )
        raw = self._call_model(prompt)
        if raw is None:
            return None
        result = self._parse_json(raw)
        if not isinstance(result, dict):
            return None
        # Validate required fields
        if "category" not in result or "severity" not in result:
            return None
        return result

    async def predict_bottleneck(
        self,
        current_state: dict,
        trend_analysis: str,
        weather: str,
        metro_delay: int,
        lookahead_minutes: int = 20,
    ) -> list | None:
        """Predict bottlenecks using Gemini. Returns list of prediction dicts or None."""
        prompt = PREDICT_PROMPT_TEMPLATE.format(
            lookahead_minutes=lookahead_minutes,
            current_state_json=json.dumps(current_state, indent=2),
            trend_analysis=trend_analysis,
            weather_condition=weather,
            metro_delay_minutes=metro_delay,
        )
        raw = self._call_model(prompt)
        if raw is None:
            return None
        result = self._parse_json(raw)
        if not isinstance(result, dict) or "predictions" not in result:
            return None
        return result["predictions"]

    async def generate_broadcast_messages(
        self,
        affected_gates: list[str],
        reason: str,
        alternative_gate: str,
        urgency: str,
        languages: list[str],
    ) -> dict | None:
        """Generate multilingual broadcast messages. Returns {lang: message} or None."""
        prompt = BROADCAST_PROMPT_TEMPLATE.format(
            languages_list=", ".join(languages),
            affected_gates=", ".join(affected_gates),
            reason=reason,
            alternative_gate=alternative_gate,
            urgency=urgency,
        )
        raw = self._call_model(prompt)
        if raw is None:
            return None
        result = self._parse_json(raw)
        if not isinstance(result, dict):
            return None
        return result


gemini_service = GeminiService()
