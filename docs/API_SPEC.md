# MatchDay Command — API Specification

> **Version**: 1.0.0 | **Base URL**: `https://api.matchday-command.com` | **Protocol**: HTTPS

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Common Formats](#2-common-formats)
3. [Rate Limiting](#3-rate-limiting)
4. [Endpoints](#4-endpoints)
   - [POST /api/route](#41-post-apiroute)
   - [GET /api/heatmap](#42-get-apiheatmap)
   - [GET /api/incidents](#43-get-apiincidents)
   - [POST /api/incidents](#44-post-apiincidents)
   - [POST /api/incidents/{id}/triage](#45-post-apiincidentsidtriage)
   - [POST /api/predict-bottleneck](#46-post-apipredict-bottleneck)
   - [POST /api/reroute-broadcast](#47-post-apireroute-broadcast)
   - [GET /api/sse/reroute](#48-get-apisseroute)
   - [GET /api/health](#49-get-apihealth)
5. [Graceful Degradation Summary](#5-graceful-degradation-summary)

---

## 1. Authentication

The API is publicly accessible during the FIFA World Cup 2026 event window. No API key is required for fan-facing endpoints.

For operations staff endpoints (`POST /api/incidents`, `POST /api/incidents/{id}/triage`, `POST /api/reroute-broadcast`, `POST /api/predict-bottleneck`), include the stadium operations session header:

```
X-Staff-Token: <uuid-v4-token>
X-Stadium-ID: <stadium-id>
```

For the Fan PWA endpoints, include:

```
X-Session-Token: <uuid-v4-token>
X-Stadium-ID: <stadium-id>
```

> **Note**: These tokens are informational session identifiers, not security credentials. They expire 24 hours after match end. All sensitive operations require staff credentials managed by the stadium operations centre.

---

## 2. Common Formats

### 2.1 Error Response

All error responses follow this schema:

```json
{
  "detail": "Human-readable error message",
  "status_code": 422,
  "error_type": "ValidationError",
  "field_errors": [
    {
      "field": "from_location",
      "message": "Field required"
    }
  ]
}
```

| Field         | Type    | Always Present | Description                          |
|---------------|---------|----------------|--------------------------------------|
| `detail`      | string  | Yes            | Human-readable error description     |
| `status_code` | integer | Yes            | HTTP status code                     |
| `error_type`  | string  | No             | Machine-readable error category      |
| `field_errors`| array   | No             | Field-level validation errors        |

### 2.2 HTTP Status Codes

| Code | Meaning                      | When Used                                      |
|------|------------------------------|------------------------------------------------|
| 200  | OK                           | Successful GET request                         |
| 201  | Created                      | Successful POST creating a resource            |
| 400  | Bad Request                  | Invalid JSON or business logic error           |
| 422  | Unprocessable Entity         | Pydantic validation failure                    |
| 429  | Too Many Requests            | Rate limit exceeded                            |
| 500  | Internal Server Error        | Unhandled exception (always logged)            |
| 503  | Service Unavailable          | All fallbacks exhausted (extremely rare)       |

### 2.3 Timestamps

All timestamps are ISO 8601 UTC strings: `"2026-07-07T10:05:00Z"`

### 2.4 Stadium IDs

Stadium IDs are kebab-case strings matching FIFA venue identifiers:

| Stadium ID                    | Venue                              |
|-------------------------------|------------------------------------|
| `levis-stadium-sf`            | Levi's Stadium, Santa Clara CA     |
| `metlife-stadium-ny`          | MetLife Stadium, East Rutherford NJ|
| `sofi-stadium-la`             | SoFi Stadium, Inglewood CA         |
| `att-stadium-dallas`          | AT&T Stadium, Arlington TX         |
| `hard-rock-stadium-miami`     | Hard Rock Stadium, Miami Gardens FL|
| `arrowhead-stadium-kc`        | Arrowhead Stadium, Kansas City MO  |
| `century-link-seattle`        | Lumen Field, Seattle WA            |
| `bc-place-vancouver`          | BC Place Stadium, Vancouver BC     |
| `estadio-azteca-mexico`       | Estadio Azteca, Mexico City MX     |
| `estadio-bbva-monterrey`      | Estadio BBVA, Monterrey MX         |
| `estadio-akron-guadalajara`   | Estadio Akron, Guadalajara MX      |
| `estadio-guadalupe-toronto`   | BMO Field, Toronto ON              |

---

## 3. Rate Limiting

| Endpoint Category     | Limit                    | Window  | Response on Exceed             |
|-----------------------|--------------------------|---------|--------------------------------|
| Fan PWA read endpoints| 60 requests              | 1 min   | HTTP 429 with Retry-After      |
| Fan PWA POST          | 10 requests              | 1 min   | HTTP 429 with Retry-After      |
| Ops staff endpoints   | 120 requests             | 1 min   | HTTP 429 with Retry-After      |
| SSE `/api/sse/reroute`| 1 connection per session | —       | HTTP 429 on second attempt     |
| `/api/health`         | Unlimited                | —       | Never rate-limited             |

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 54
X-RateLimit-Reset: 1751865960
Retry-After: 42   (only on 429)
```

---

## 4. Endpoints

---

### 4.1 POST /api/route

Calculate an optimal walking route for a fan inside the stadium.

**Method**: `POST`
**Path**: `/api/route`
**Auth**: Session token (fan)

#### Request Schema

```json
{
  "from_location": {
    "lat": 37.4033,
    "lng": -121.9694,
    "label": "Parking Lot B Entry"
  },
  "to_location": {
    "lat": 37.4018,
    "lng": -121.9706,
    "label": "Gate C"
  },
  "stadium_id": "levis-stadium-sf",
  "avoid_crowds": true,
  "accessibility_required": false
}
```

| Field                   | Type    | Required | Description                                        |
|-------------------------|---------|----------|----------------------------------------------------|
| `from_location`         | object  | Yes      | Starting coordinates and optional label            |
| `from_location.lat`     | float   | Yes      | Latitude (-90 to 90)                               |
| `from_location.lng`     | float   | Yes      | Longitude (-180 to 180)                            |
| `from_location.label`   | string  | No       | Human-readable starting point name                 |
| `to_location`           | object  | Yes      | Destination coordinates and optional label         |
| `to_location.lat`       | float   | Yes      | Latitude (-90 to 90)                               |
| `to_location.lng`       | float   | Yes      | Longitude (-180 to 180)                            |
| `to_location.label`     | string  | No       | Human-readable destination name                    |
| `stadium_id`            | string  | Yes      | Valid stadium identifier (see §2.4)                |
| `avoid_crowds`          | boolean | No       | Prefer lower-density paths (default: true)         |
| `accessibility_required`| boolean | No       | Return ADA-accessible route only (default: false)  |

#### Response Schema (200 OK)

```json
{
  "route_id": "rt_8f3a9c2b",
  "from_location": {
    "lat": 37.4033,
    "lng": -121.9694,
    "label": "Parking Lot B Entry"
  },
  "to_location": {
    "lat": 37.4018,
    "lng": -121.9706,
    "label": "Gate C"
  },
  "polyline": "yvjeF~|qhVaBd@...",
  "distance_m": 420,
  "duration_min": 6,
  "waypoints": [
    { "lat": 37.4028, "lng": -121.9699, "label": "Cross Plaza Bridge" }
  ],
  "crowd_warnings": [
    { "zone": "Section 110 Concourse", "density_pct": 82, "severity": "high" }
  ],
  "is_accessible": false,
  "cached": false,
  "data_source": "google_maps"
}
```

#### Error Codes

| Status | `error_type`           | Cause                                        |
|--------|------------------------|----------------------------------------------|
| 400    | `InvalidStadiumId`     | Unknown stadium_id value                     |
| 400    | `RouteNotFound`        | No walkable path found between coordinates   |
| 422    | `ValidationError`      | Missing/invalid request fields               |
| 500    | `MapsApiError`         | Google Maps API failure (fallback attempted) |

#### Graceful Degradation

When Google Maps API is unavailable, the endpoint:
1. Queries Firestore `routes` collection for a cached route matching the nearest gate pair
2. Returns the cached route with `"data_source": "cache"` and `"cached": true`
3. If no cache: returns nearest gate GPS coordinates with a `"walking_estimate_min"` based on straight-line distance × 1.4 multiplier

#### cURL Example

```bash
curl -X POST https://api.matchday-command.com/api/route \
  -H "Content-Type: application/json" \
  -H "X-Stadium-ID: levis-stadium-sf" \
  -H "X-Session-Token: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "from_location": {"lat": 37.4033, "lng": -121.9694, "label": "Parking Lot B"},
    "to_location": {"lat": 37.4018, "lng": -121.9706, "label": "Gate C"},
    "stadium_id": "levis-stadium-sf",
    "avoid_crowds": true
  }'
```

---

### 4.2 GET /api/heatmap

Retrieve the current crowd density heatmap for a stadium.

**Method**: `GET`
**Path**: `/api/heatmap`
**Auth**: Session token (fan or staff)

#### Query Parameters

| Parameter    | Type   | Required | Description                          |
|--------------|--------|----------|--------------------------------------|
| `stadium_id` | string | Yes      | Valid stadium identifier             |
| `resolution` | string | No       | `"50x50"` (default) or `"25x25"`    |

#### Response Schema (200 OK)

```json
{
  "stadium_id": "levis-stadium-sf",
  "captured_at": "2026-07-07T10:04:30Z",
  "overall_density": 0.67,
  "resolution": "50x50",
  "grid": [
    {
      "zone": "Section 110",
      "row": 11,
      "col": 0,
      "density_pct": 0.82,
      "count": 450,
      "risk_level": "high"
    },
    {
      "zone": "Gate A Concourse",
      "row": 0,
      "col": 5,
      "density_pct": 0.34,
      "count": 188,
      "risk_level": "low"
    }
  ],
  "high_density_zones": ["Section 110", "Gate B Entry"],
  "cache_max_age_seconds": 30
}
```

#### Caching

Responses include `Cache-Control: max-age=30, public`. Fan PWA polls every 30 seconds. Ops Dashboard polls every 10 seconds (ignores cache header with `Cache-Control: no-cache`).

#### Error Codes

| Status | `error_type`       | Cause                        |
|--------|--------------------|------------------------------|
| 400    | `InvalidStadiumId` | Unknown stadium_id           |
| 422    | `ValidationError`  | Missing stadium_id parameter |

#### Graceful Degradation

If Firestore is unavailable, returns the last in-memory cached snapshot with header `X-Data-Source: memory-cache` and `X-Cache-Age-Seconds: <seconds>`.

#### cURL Example

```bash
curl "https://api.matchday-command.com/api/heatmap?stadium_id=levis-stadium-sf" \
  -H "X-Session-Token: 550e8400-e29b-41d4-a716-446655440000"
```

---

### 4.3 GET /api/incidents

List active incidents for a stadium.

**Method**: `GET`
**Path**: `/api/incidents`
**Auth**: Staff token

#### Query Parameters

| Parameter    | Type   | Required | Description                                                |
|--------------|--------|----------|------------------------------------------------------------|
| `stadium_id` | string | Yes      | Valid stadium identifier                                   |
| `status`     | string | No       | Filter: `open`, `triaged`, `in_progress`, `resolved`, `all`|
| `severity`   | string | No       | Filter: `low`, `medium`, `high`, `critical`                |
| `limit`      | int    | No       | Max results (default: 50, max: 200)                        |

#### Response Schema (200 OK)

```json
{
  "stadium_id": "levis-stadium-sf",
  "total": 3,
  "incidents": [
    {
      "id": "inc_7a4f2c1d",
      "type": "medical",
      "severity": "high",
      "status": "triaged",
      "location": {
        "zone": "Section 112",
        "lat": 37.4021,
        "lng": -121.9701
      },
      "description": "Fan requiring medical assistance, possible heat exhaustion",
      "triage_result": {
        "priority": "P1",
        "recommended_actions": ["Deploy medical team", "Clear pathway in Section 112"],
        "estimated_resolution_min": 15,
        "ai_model": "gemini-1.5-pro"
      },
      "created_at": "2026-07-07T09:55:00Z",
      "updated_at": "2026-07-07T09:56:30Z"
    }
  ]
}
```

#### cURL Example

```bash
curl "https://api.matchday-command.com/api/incidents?stadium_id=levis-stadium-sf&status=open" \
  -H "X-Staff-Token: <staff-uuid>" \
  -H "X-Stadium-ID: levis-stadium-sf"
```

---

### 4.4 POST /api/incidents

Report a new incident.

**Method**: `POST`
**Path**: `/api/incidents`
**Auth**: Staff token

#### Request Schema

```json
{
  "stadium_id": "levis-stadium-sf",
  "type": "medical",
  "severity": "high",
  "location": {
    "zone": "Section 112",
    "lat": 37.4021,
    "lng": -121.9701
  },
  "description": "Fan requiring medical assistance, possible heat exhaustion",
  "reported_by": "staff_id_hashed_here"
}
```

| Field              | Type   | Required | Constraints                                              |
|--------------------|--------|----------|----------------------------------------------------------|
| `stadium_id`       | string | Yes      | Valid stadium ID                                         |
| `type`             | string | Yes      | `medical` \| `security` \| `crowd` \| `fire` \| `technical` |
| `severity`         | string | Yes      | `low` \| `medium` \| `high` \| `critical`                |
| `location.zone`    | string | Yes      | Max 100 characters                                       |
| `location.lat`     | float  | No       | -90 to 90                                                |
| `location.lng`     | float  | No       | -180 to 180                                              |
| `description`      | string | Yes      | Max 500 characters, HTML-stripped                        |
| `reported_by`      | string | Yes      | SHA-256 hash of staff ID                                 |

#### Response Schema (201 Created)

```json
{
  "id": "inc_7a4f2c1d",
  "stadium_id": "levis-stadium-sf",
  "type": "medical",
  "severity": "high",
  "status": "open",
  "location": {
    "zone": "Section 112",
    "lat": 37.4021,
    "lng": -121.9701
  },
  "description": "Fan requiring medical assistance, possible heat exhaustion",
  "created_at": "2026-07-07T09:55:00Z",
  "triage_result": null
}
```

#### Error Codes

| Status | `error_type`           | Cause                               |
|--------|------------------------|-------------------------------------|
| 400    | `InvalidStadiumId`     | Unknown stadium_id                  |
| 422    | `ValidationError`      | Missing or invalid fields           |
| 429    | `RateLimitExceeded`    | Too many incident reports           |

#### cURL Example

```bash
curl -X POST https://api.matchday-command.com/api/incidents \
  -H "Content-Type: application/json" \
  -H "X-Staff-Token: <staff-uuid>" \
  -H "X-Stadium-ID: levis-stadium-sf" \
  -d '{
    "stadium_id": "levis-stadium-sf",
    "type": "medical",
    "severity": "high",
    "location": {"zone": "Section 112", "lat": 37.4021, "lng": -121.9701},
    "description": "Fan requiring medical assistance",
    "reported_by": "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
  }'
```

---

### 4.5 POST /api/incidents/{id}/triage

Run AI-powered triage on an existing incident.

**Method**: `POST`
**Path**: `/api/incidents/{id}/triage`
**Auth**: Staff token

#### Path Parameters

| Parameter | Type   | Description              |
|-----------|--------|--------------------------|
| `id`      | string | Incident ID (e.g., `inc_7a4f2c1d`) |

#### Request Schema

```json
{
  "stadium_id": "levis-stadium-sf"
}
```

#### Response Schema (200 OK)

```json
{
  "incident_id": "inc_7a4f2c1d",
  "triage_result": {
    "priority": "P1",
    "recommended_actions": [
      "Deploy medical team immediately to Section 112",
      "Clear a 5-metre pathway through Section 112 concourse",
      "Alert nearest first aid station at Gate C"
    ],
    "estimated_resolution_min": 15,
    "ai_model": "gemini-1.5-pro",
    "reasoning": "High-severity medical incident in a high-density zone during peak match time requires immediate P1 response."
  },
  "updated_at": "2026-07-07T09:56:30Z"
}
```

#### Graceful Degradation

If Vertex AI / Gemini is unavailable, returns rule-based triage with `"ai_model": "rule-based"`:

```json
{
  "incident_id": "inc_7a4f2c1d",
  "triage_result": {
    "priority": "P1",
    "recommended_actions": [
      "Dispatch medical personnel",
      "Secure the area",
      "Contact stadium control"
    ],
    "estimated_resolution_min": 20,
    "ai_model": "rule-based",
    "reasoning": "Automated rule-based triage: medical + high severity = P1."
  }
}
```

#### Error Codes

| Status | `error_type`         | Cause                                 |
|--------|----------------------|---------------------------------------|
| 404    | `IncidentNotFound`   | No incident with the given ID         |
| 400    | `AlreadyTriaged`     | Incident already has a triage result  |
| 422    | `ValidationError`    | Missing stadium_id in body            |

#### cURL Example

```bash
curl -X POST https://api.matchday-command.com/api/incidents/inc_7a4f2c1d/triage \
  -H "Content-Type: application/json" \
  -H "X-Staff-Token: <staff-uuid>" \
  -d '{"stadium_id": "levis-stadium-sf"}'
```

---

### 4.6 POST /api/predict-bottleneck

Use AI to predict crowd bottlenecks within a time horizon.

**Method**: `POST`
**Path**: `/api/predict-bottleneck`
**Auth**: Staff token

#### Request Schema

```json
{
  "stadium_id": "levis-stadium-sf",
  "zone": "Gate A",
  "time_horizon_min": 30
}
```

| Field              | Type    | Required | Constraints                          |
|--------------------|---------|----------|--------------------------------------|
| `stadium_id`       | string  | Yes      | Valid stadium ID                     |
| `zone`             | string  | No       | Specific zone to focus on; null=all  |
| `time_horizon_min` | integer | Yes      | 5 to 120 minutes                     |

#### Response Schema (200 OK)

```json
{
  "stadium_id": "levis-stadium-sf",
  "prediction_generated_at": "2026-07-07T10:05:00Z",
  "time_horizon_min": 30,
  "zones_at_risk": [
    {
      "zone": "Gate A",
      "predicted_density_pct": 91,
      "current_density_pct": 74,
      "risk_level": "critical",
      "trend": "increasing"
    },
    {
      "zone": "Section 101-110 Concourse",
      "predicted_density_pct": 78,
      "current_density_pct": 65,
      "risk_level": "high",
      "trend": "increasing"
    }
  ],
  "confidence": 0.83,
  "suggested_actions": [
    "Open overflow Gate A-East immediately",
    "Deploy 4 staff members to Gate A corridor",
    "Trigger reroute broadcast directing fans to Gates B and C"
  ],
  "ai_model": "gemini-1.5-pro",
  "reasoning": "Post-match crowd flow patterns combined with current Gate A density of 74% suggest critical congestion within 30 minutes as 68,000 fans begin exiting simultaneously."
}
```

#### Graceful Degradation

If Gemini unavailable, returns threshold-based prediction with `"ai_model": "threshold-rules"`. All zones currently above 70% density are flagged as high/critical risk.

#### cURL Example

```bash
curl -X POST https://api.matchday-command.com/api/predict-bottleneck \
  -H "Content-Type: application/json" \
  -H "X-Staff-Token: <staff-uuid>" \
  -d '{
    "stadium_id": "levis-stadium-sf",
    "zone": "Gate A",
    "time_horizon_min": 30
  }'
```

---

### 4.7 POST /api/reroute-broadcast

Broadcast a rerouting message to all fans connected via SSE.

**Method**: `POST`
**Path**: `/api/reroute-broadcast`
**Auth**: Staff token

#### Request Schema

```json
{
  "stadium_id": "levis-stadium-sf",
  "message": "Gate A is at capacity. Please proceed to Gate C or Gate D for faster entry.",
  "affected_zones": ["Gate A", "Parking Lot A"],
  "severity": "warning",
  "ai_generate_message": false
}
```

| Field                 | Type          | Required | Constraints                                |
|-----------------------|---------------|----------|--------------------------------------------|
| `stadium_id`          | string        | Yes      | Valid stadium ID                           |
| `message`             | string        | No*      | Max 500 chars. Required if `ai_generate_message=false` |
| `affected_zones`      | array<string> | Yes      | At least 1 zone name                       |
| `severity`            | string        | Yes      | `info` \| `warning` \| `critical`          |
| `ai_generate_message` | boolean       | No       | If true, Gemini composes the message (default: false) |

*If `ai_generate_message=true`, `message` is optional and used as a hint.

#### Response Schema (200 OK)

```json
{
  "broadcast_id": "bc_9e2a1f4d",
  "stadium_id": "levis-stadium-sf",
  "message": "Gate A is at capacity. Please proceed to Gate C or Gate D for faster entry.",
  "affected_zones": ["Gate A", "Parking Lot A"],
  "severity": "warning",
  "fan_reach_count": 42817,
  "created_at": "2026-07-07T10:05:10Z",
  "expires_at": "2026-07-08T02:00:00Z",
  "ai_generated": false
}
```

#### Graceful Degradation

If Gemini unavailable and `ai_generate_message=true`, falls back to template:
```
"[{severity_emoji}] Attention fans in {affected_zones}: {reason}. Please follow staff directions."
```

#### Error Codes

| Status | `error_type`           | Cause                                    |
|--------|------------------------|------------------------------------------|
| 400    | `InvalidStadiumId`     | Unknown stadium_id                       |
| 400    | `MessageRequired`      | `ai_generate_message=false` but no message provided |
| 400    | `NoZonesSpecified`     | `affected_zones` is empty                |
| 422    | `ValidationError`      | Invalid severity value                   |

#### cURL Example

```bash
curl -X POST https://api.matchday-command.com/api/reroute-broadcast \
  -H "Content-Type: application/json" \
  -H "X-Staff-Token: <staff-uuid>" \
  -d '{
    "stadium_id": "levis-stadium-sf",
    "message": "Gate A is at capacity. Please use Gate C or D.",
    "affected_zones": ["Gate A"],
    "severity": "warning"
  }'
```

---

### 4.8 GET /api/sse/reroute

Establish a Server-Sent Events (SSE) connection to receive live reroute alerts.

**Method**: `GET`
**Path**: `/api/sse/reroute`
**Auth**: Session token (fan or staff)

#### Query Parameters

| Parameter    | Type   | Required | Description              |
|--------------|--------|----------|--------------------------|
| `stadium_id` | string | Yes      | Stadium to subscribe to  |

#### Request Headers

| Header              | Required | Description                                          |
|---------------------|----------|------------------------------------------------------|
| `Accept`            | Yes      | Must be `text/event-stream`                          |
| `X-Session-Token`   | Yes      | Fan or staff session UUID                            |
| `Last-Event-ID`     | No       | Replay broadcasts sent after this ID on reconnect    |

#### Response

**Status**: 200 OK
**Content-Type**: `text/event-stream`
**Cache-Control**: `no-cache`
**Connection**: `keep-alive`

**Stream Format**:

```
: keepalive

event: reroute
id: bc_9e2a1f4d
data: {"broadcast_id":"bc_9e2a1f4d","message":"Gate A is at capacity. Please use Gate C or D.","affected_zones":["Gate A"],"severity":"warning","timestamp":"2026-07-07T10:05:10Z"}

: keepalive

event: reroute
id: bc_9e2a1f5e
data: {"broadcast_id":"bc_9e2a1f5e","message":"Medical team requested at Section 112. Please maintain clear pathways.","affected_zones":["Section 112"],"severity":"critical","timestamp":"2026-07-07T10:07:45Z"}
```

**Event Fields**:

| Field         | Type          | Description                                     |
|---------------|---------------|-------------------------------------------------|
| `broadcast_id`| string        | Unique broadcast identifier                     |
| `message`     | string        | Broadcast message text (English)                |
| `affected_zones` | array<string>| Zones the message applies to                 |
| `severity`    | string        | `info` \| `warning` \| `critical`               |
| `timestamp`   | string        | ISO 8601 UTC timestamp                          |

**Keepalive**: Server sends `: keepalive` comment every 15 seconds to prevent connection timeout.

#### Reconnection Behavior

The browser's native EventSource API automatically reconnects on connection loss. The reconnection interval starts at 1 second and increases exponentially up to 30 seconds.

When reconnecting with `Last-Event-ID`, the backend replays all broadcasts that occurred after that event ID from the Firestore `broadcasts` collection (up to 50 missed events, up to 2 hours back).

#### cURL Example

```bash
curl -N "https://api.matchday-command.com/api/sse/reroute?stadium_id=levis-stadium-sf" \
  -H "Accept: text/event-stream" \
  -H "X-Session-Token: 550e8400-e29b-41d4-a716-446655440000"
```

#### Error Codes

| Status | `error_type`        | Cause                                       |
|--------|---------------------|---------------------------------------------|
| 400    | `InvalidStadiumId`  | Unknown stadium_id                          |
| 429    | `AlreadyConnected`  | Session already has an active SSE connection|
| 422    | `ValidationError`   | Missing stadium_id parameter                |

---

### 4.9 GET /api/health

System health check endpoint for load balancers and monitoring.

**Method**: `GET`
**Path**: `/api/health`
**Auth**: None required

#### Response Schema (200 OK — Healthy)

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-07-07T10:05:00Z",
  "services": {
    "firestore": "connected",
    "vertex_ai": "available",
    "maps_api": "available"
  },
  "uptime_seconds": 3602,
  "sse_connections": 42817,
  "active_incidents": 3
}
```

#### Response Schema (200 OK — Degraded)

```json
{
  "status": "degraded",
  "version": "1.0.0",
  "timestamp": "2026-07-07T10:05:00Z",
  "services": {
    "firestore": "connected",
    "vertex_ai": "unavailable",
    "maps_api": "available"
  },
  "uptime_seconds": 3602,
  "sse_connections": 42817,
  "active_incidents": 3,
  "degraded_features": ["ai_triage", "bottleneck_prediction"]
}
```

> **Note**: Health endpoint always returns HTTP 200, even when degraded. Only returns 500 if the application itself is broken. This allows load balancers to distinguish between "instance is broken" (500) and "external service is down" (200 + degraded status).

#### cURL Example

```bash
curl https://api.matchday-command.com/api/health
```

---

## 5. Graceful Degradation Summary

| External Dependency | Affected Endpoints                                    | Fallback Behavior                          |
|---------------------|-------------------------------------------------------|--------------------------------------------|
| **Google Maps API** | `POST /api/route`                                     | Cached Firestore routes; straight-line estimate |
| **Vertex AI Gemini**| `/api/incidents/{id}/triage`, `/api/predict-bottleneck`, `/api/reroute-broadcast` | Rule-based triage; threshold predictions; template messages |
| **Firestore**       | All read/write endpoints                              | In-memory mock store; SSE via process-local queues |
| **Network (fan)**   | All PWA features                                      | Service worker cache; offline banner; background sync |
