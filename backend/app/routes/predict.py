"""POST /api/predict — 15-30 minute bottleneck prediction using rules + Gemini."""
from __future__ import annotations
import logging

from fastapi import APIRouter
from app.models.prediction import PredictRequest, PredictionResponse, PredictionItem
from app.services.gemini import gemini_service
from app.services import firestore as db
from app.services.prediction import rule_based_predict, calculate_trend_analysis

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/api/predict", response_model=PredictionResponse, tags=["Predictions"])
async def predict_bottleneck(request: PredictRequest) -> PredictionResponse:
    """
    Generate 15-30 min bottleneck predictions.

    Strategy:
    1. Get current stadium state from Firestore
    2. Run rule-based prediction (always available)
    3. Overlay Gemini AI predictions for enhanced reason/action text
    4. Merge results: Gemini enriches text, rules provide base confidence
    """
    current_state = db.get_stadium_state()
    recent_signals = db.get_crowd_signals(limit=20)
    trend_analysis = calculate_trend_analysis(recent_signals)

    # Rule-based predictions (always succeeds)
    rule_predictions = rule_based_predict(current_state, request.lookahead_minutes)

    # Build a lookup by gate name
    rule_lookup: dict[str, dict] = {p["gate"]: p for p in rule_predictions}

    # Attempt Gemini overlay
    gemini_preds = await gemini_service.predict_bottleneck(
        current_state=current_state,
        trend_analysis=trend_analysis,
        weather=current_state.get("weather_condition", "clear"),
        metro_delay=current_state.get("metro_delay_minutes", 0),
        lookahead_minutes=request.lookahead_minutes,
    )

    if gemini_preds:
        logger.info(f"Gemini returned {len(gemini_preds)} predictions; merging with rules")
        for gp in gemini_preds:
            gate = gp.get("gate", "")
            if gate in rule_lookup:
                # Enrich rule prediction with Gemini's reasoning
                rule_lookup[gate]["reason"] = gp.get("reason", rule_lookup[gate]["reason"])
                rule_lookup[gate]["recommended_action"] = gp.get(
                    "recommended_action", rule_lookup[gate]["recommended_action"]
                )
                rule_lookup[gate]["ai_source"] = "gemini"
                # Average confidence
                gemini_conf = gp.get("confidence_percent", rule_lookup[gate]["confidence_percent"])
                rule_conf = rule_lookup[gate]["confidence_percent"]
                rule_lookup[gate]["confidence_percent"] = int((gemini_conf + rule_conf) / 2)
    else:
        logger.info("Gemini unavailable for predictions; using pure rules-based output")

    # Rebuild sorted predictions list
    final_predictions = sorted(
        rule_lookup.values(),
        key=lambda p: p["predicted_capacity_percent"],
        reverse=True,
    )

    items = [
        PredictionItem(
            gate=p["gate"],
            current_capacity_percent=p["current_capacity_percent"],
            predicted_capacity_percent=p["predicted_capacity_percent"],
            time_to_critical=p["time_to_critical"],
            risk_level=p["risk_level"],
            reason=p["reason"],
            recommended_action=p["recommended_action"],
            confidence_percent=p["confidence_percent"],
            ai_source=p["ai_source"],
        )
        for p in final_predictions
    ]

    return PredictionResponse(predictions=items)
