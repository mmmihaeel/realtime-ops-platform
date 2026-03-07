# API Overview

Base path: `/api/v1`

## Authentication

Most endpoints require:

- `x-operator-token`
- `x-operator-id`

Public endpoints:

- `GET /health`

Common auth failures:

- missing/invalid token -> `401`
- missing operator ID -> `401`

## Response Envelope

Successful responses:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Validation failed",
    "path": "/api/v1/jobs",
    "timestamp": "2026-03-07T12:00:00.000Z"
  }
}
```

## Pagination / Filtering / Sorting

List endpoints support `page` and `limit`.

Additional filters:

- `GET /jobs`: `status`, `type`, `search`, `sortBy`, `sortOrder`
- `GET /alerts`: `status`, `severity`
- `GET /notifications`: `type`, `unreadOnly`
- `GET /audit-entries`: `actorType`, `entityType`, `entityId`

Rate limiting:

- Authenticated API routes are protected by Redis-backed rate limiting.
- Exceeding the threshold returns `429`.

## Endpoints

- `GET /health`
- `POST /jobs`
- `GET /jobs`
- `GET /jobs/:id`
- `GET /jobs/:id/status`
- `POST /jobs/:id/retry`
- `POST /alerts`
- `GET /alerts`
- `GET /alerts/:id`
- `POST /incidents/:id/acknowledge`
- `POST /incidents/:id/resolve`
- `GET /notifications`
- `GET /audit-entries`
- `GET /processing/status`

## Swagger

Interactive docs are exposed at `/api/docs`.

## Realtime Companion Interface

The REST API is paired with a websocket stream (`ws://localhost:3002/realtime`) for lifecycle events tied to these operations.
