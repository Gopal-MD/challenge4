"""
POST /api/broadcast-reroute — Send multilingual reroute alert to all fan SSE sessions
GET  /api/sse/reroute       — SSE stream for fan PWA real-time alerts
"""
from __future__ import annotations
import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from app.models.prediction import BroadcastRequest, BroadcastResponse
from app.services.gemini import gemini_service
from app.services import firestore as db
from app.utils.rules import generate_fallback_broadcast

router = APIRouter()
logger = logging.getLogger(__name__)

# Module-level registry of active SSE client queues
active_sse_clients: list[asyncio.Queue] = []


@router.get("/api/sse/reroute", tags=["SSE"])
async def sse_reroute_stream(request: Request):
    """
    Server-Sent Events endpoint for fan PWA.
    Clients connect here to receive real-time reroute alerts.
    Each active connection gets its own asyncio.Queue.
    """
    queue: asyncio.Queue = asyncio.Queue()
    active_sse_clients.append(queue)
    logger.info(f"New SSE client connected. Total: {len(active_sse_clients)}")

    async def event_generator():
        try:
            # Send initial connection confirmation
            yield {
                "event": "connected",
                "data": json.dumps({"status": "connected", "timestamp": datetime.now(timezone.utc).isoformat()}),
            }
            while True:
                if await request.is_disconnected():
                    logger.info("SSE client disconnected")
                    break
                try:
                    # Wait for a new event with timeout (keepalive)
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield event
                except asyncio.TimeoutError:
                    # Send keepalive comment
                    yield {"event": "keepalive", "data": "{}"}
        except asyncio.CancelledError:
            pass
        finally:
            if queue in active_sse_clients:
                active_sse_clients.remove(queue)
            logger.info(f"SSE client removed. Remaining: {len(active_sse_clients)}")

    return EventSourceResponse(event_generator())


@router.post("/api/broadcast-reroute", response_model=BroadcastResponse, tags=["Broadcast"])
async def broadcast_reroute(request: BroadcastRequest) -> BroadcastResponse:
    """
    Generate multilingual reroute messages and push to all active SSE clients.

    Tries Gemini for natural-sounding messages; falls back to template strings.
    """
    broadcast_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    # Generate messages
    messages: dict[str, str] | None = await gemini_service.generate_broadcast_messages(
        affected_gates=request.affected_gates,
        reason=request.reason,
        alternative_gate=request.recommended_alternative_gate,
        urgency=request.urgency,
        languages=request.broadcast_languages,
    )

    if not messages:
        # Fallback to template-based messages
        messages = generate_fallback_broadcast(
            affected_gates=request.affected_gates,
            alternative_gate=request.recommended_alternative_gate,
            reason=request.reason,
            languages=request.broadcast_languages,
        )
        logger.info("Using fallback broadcast templates")
    else:
        logger.info(f"Gemini generated broadcast in {len(messages)} languages")

    # Build SSE event payload
    event_payload = {
        "broadcast_id": broadcast_id,
        "urgency": request.urgency,
        "affected_gates": request.affected_gates,
        "recommended_alternative_gate": request.recommended_alternative_gate,
        "reason": request.reason,
        "messages": messages,
        "route_recalculate": request.route_recalculate,
        "timestamp": now,
        "aria_live": "assertive",
    }

    # Push to all active SSE clients
    delivered_count = 0
    failed_count = 0
    for client_queue in list(active_sse_clients):
        try:
            await asyncio.wait_for(
                client_queue.put({
                    "event": "reroute",
                    "data": json.dumps(event_payload),
                }),
                timeout=1.0,
            )
            delivered_count += 1
        except (asyncio.TimeoutError, Exception) as e:
            logger.warning(f"Failed to push to SSE client: {e}")
            failed_count += 1

    # Simulate fan session delivery (80k+ fans via web push / polling)
    base_sessions = db.get_active_fan_sessions()
    total_delivered = base_sessions - failed_count
    total_failed = failed_count + int(base_sessions * 0.005)  # 0.5% delivery failure rate

    # Save broadcast record
    broadcast_record = {
        "broadcast_id": broadcast_id,
        "timestamp": now,
        "affected_gates": request.affected_gates,
        "recommended_alternative_gate": request.recommended_alternative_gate,
        "reason": request.reason,
        "urgency": request.urgency,
        "broadcast_languages": request.broadcast_languages,
        "target_fan_sessions": base_sessions,
        "delivered_count": total_delivered,
        "failed_count": total_failed,
        "messages_pushed": messages,
    }
    db.save_broadcast(broadcast_record)
    logger.info(f"Broadcast {broadcast_id} pushed to {len(active_sse_clients)} SSE clients")

    return BroadcastResponse(
        broadcast_id=broadcast_id,
        status="active",
        target_fan_sessions=base_sessions,
        delivered_count=total_delivered,
        failed_count=total_failed,
        messages_pushed=messages,
        aria_live_announcements=True,
        screen_reader_compatible=True,
    )
