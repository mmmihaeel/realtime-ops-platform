# API Overview

The REST API is the authenticated control surface for creating jobs, inspecting operational state, and advancing incident workflows.

Related docs: [README](../README.md), [Architecture](architecture.md), [Domain Model](domain-model.md), [WebSocket Flow](websocket-flow.md)

## Base URL and Documentation

- Base path: `/api/v1`
- Swagger UI: `/api/docs`
- Public health endpoint: `GET /api/v1/health`

## Authentication Model

Most routes require both headers below:

| Header             | Purpose                                                                           |
| ------------------ | --------------------------------------------------------------------------------- |
| `x-operator-token` | Shared operator token validated by `OperatorAuthGuard`                            |
| `x-operator-id`    | Operator identity stored on the request and used in audit/operator action records |

Current access model notes:

- Authentication is operator-oriented rather than end-user oriented.
- The same shared token model is used for REST and WebSocket access.
- The current implementation does not include RBAC or per-route scoped permissions.

## Response Envelope

Successful responses are wrapped as:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Error responses are wrapped as:

```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Validation failed",
    "path": "/api/v1/jobs",
    "timestamp": "2026-03-14T12:00:00.000Z"
  }
}
```

## Endpoint Families

| Family             | Endpoints                                                                                  | Notes                                                     |
| ------------------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| Health             | `GET /health`                                                                              | Public dependency check for database, Redis, and RabbitMQ |
| Jobs               | `POST /jobs`, `GET /jobs`, `GET /jobs/:id`, `GET /jobs/:id/status`, `POST /jobs/:id/retry` | Core command and status surface                           |
| Alerts             | `POST /alerts`, `GET /alerts`, `GET /alerts/:id`                                           | Supports operator-created alerts and alert inspection     |
| Incidents          | `POST /incidents/:id/acknowledge`, `POST /incidents/:id/resolve`                           | Transition-only interface in the current implementation   |
| Notifications      | `GET /notifications`                                                                       | Query persisted operator feed entries                     |
| Audit              | `GET /audit-entries`                                                                       | Query immutable operational history                       |
| Processing summary | `GET /processing/status`                                                                   | Aggregated counts and average attempt duration            |

## Query, Filter, and Sort Support

### Shared Pagination

List endpoints inherit common pagination fields:

| Query param | Meaning                         | Default |
| ----------- | ------------------------------- | ------- |
| `page`      | 1-based page number             | `1`     |
| `limit`     | Page size, max `100`            | `20`    |
| `sortOrder` | `asc` or `desc` where supported | `desc`  |

### Resource-Specific Filters

| Endpoint             | Supported filters                                      |
| -------------------- | ------------------------------------------------------ | -------- | ----------------------- |
| `GET /jobs`          | `status`, `type`, `search`, `sortBy=createdAt          | priority | updatedAt`, `sortOrder` |
| `GET /alerts`        | `status`, `severity`, `page`, `limit`                  |
| `GET /notifications` | `type`, `unreadOnly`, `page`, `limit`                  |
| `GET /audit-entries` | `actorType`, `entityType`, `entityId`, `page`, `limit` |

## Request Notes by Area

### Jobs

- `POST /jobs` accepts `name`, `type`, `payload`, optional `priority`, and optional `maxAttempts`.
- `priority` and `maxAttempts` are integers in the range `1..10`.
- Job payloads are JSON objects; the current worker recognizes fields such as `failTimes` and `shouldFail` for deterministic demo and test behavior.
- `POST /jobs/:id/retry` is only valid for jobs currently in `failed` state and below their `maxAttempts` limit.

### Alerts

- `POST /alerts` accepts optional `jobId`, `severity`, `title`, `description`, and optional `createIncident`.
- Critical alerts always open an incident in the current implementation, even if `createIncident` is omitted.
- There is no public alert acknowledge/resolve REST endpoint in the current implementation.

### Incidents

- Incidents can be acknowledged or resolved.
- There is no incident list or incident detail endpoint yet.
- Incident transitions update the linked alert status when an alert relationship exists.

### Notifications and Audit

- Notifications are read-only in the current API surface.
- Audit entries are read-only and optimized for operational review rather than mutation.

## Rate Limiting

Authenticated API routes are protected by a Redis-backed fixed-window rate limit.

| Setting                     | Environment variable        |
| --------------------------- | --------------------------- |
| Maximum requests per window | `RATE_LIMIT_MAX_REQUESTS`   |
| Window size in seconds      | `RATE_LIMIT_WINDOW_SECONDS` |

Rate-limit keys are derived from IP address, HTTP method, and route path. Public routes bypass the guard.

## Operational Summary Endpoint

`GET /processing/status` is the closest thing to a compact operator dashboard in the current REST API. It returns:

- Job counts by `queued`, `processing`, `completed`, and `failed`
- Count of open alerts
- Count of open incidents
- Average processing attempt duration in milliseconds
- Timestamp of the summary

## Realtime Companion Interface

The REST API is only half of the repository story. Commands and state transitions also emit lifecycle events consumed by the realtime gateway.

For the connection model, room subscriptions, and event families, see [docs/websocket-flow.md](websocket-flow.md).
