# Security

The repository uses a deliberately lightweight but explicit security model that matches its portfolio scope: authenticated operator access, strict request validation, Redis-backed rate limiting, and persistent audit history.

Related docs: [README](../README.md), [API Overview](api-overview.md), [Deployment Notes](deployment-notes.md)

## Current Access Model

| Surface             | Current control                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| REST API            | `OperatorAuthGuard` validates `x-operator-token` and requires `x-operator-id` on non-public routes |
| WebSocket namespace | Handshake token is validated before the socket is accepted                                         |
| Public endpoints    | `GET /api/v1/health` on the API gateway and realtime gateway health are intentionally public       |
| Security headers    | `helmet()` is enabled on API and realtime Nest applications                                        |

This is operator-authenticated access, not full identity or role management.

## Validation and Input Safety

The HTTP layer uses Nest validation pipes with:

- `transform: true`
- `whitelist: true`
- `forbidNonWhitelisted: true`

Practical effect:

- unknown DTO properties are rejected
- numeric and boolean query/body fields are coerced where configured
- invalid route and payload shapes fail early with structured error responses

## Rate Limiting

Authenticated API routes are protected by `RedisRateLimitGuard`.

| Characteristic | Current behavior                                       |
| -------------- | ------------------------------------------------------ |
| Strategy       | Fixed-window counter                                   |
| Backing store  | Redis                                                  |
| Key shape      | `rate-limit:{ip}:{method}:{path}`                      |
| Configuration  | `RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_WINDOW_SECONDS` |
| Public routes  | Bypass the guard                                       |

This is intentionally simple and local-deployment friendly. It protects the demo surface without introducing additional infrastructure complexity.

## Worker Safety and Coordination

The processing service uses Redis as a coordination layer rather than a source of truth.

| Control                         | Why it exists                                                            |
| ------------------------------- | ------------------------------------------------------------------------ |
| Per-job Redis lock              | Prevents concurrent worker execution of the same job                     |
| PostgreSQL as record of truth   | Ensures final workflow state remains durable and queryable               |
| RabbitMQ durable queue/exchange | Preserves queued work and lifecycle events across normal broker restarts |

## Auditability

The repository leans heavily on persistent operational history.

| Record             | Purpose                                                    |
| ------------------ | ---------------------------------------------------------- |
| `audit_entries`    | Immutable log of system and operator actions               |
| `operator_actions` | Explicit record of operator-issued commands                |
| `notifications`    | Reviewer-visible operator feed entries for selected events |

This matters for security and operations alike: even with a lightweight auth model, sensitive state transitions are not silent.

## Current Limitations

These are real scope boundaries, not hidden omissions:

| Not implemented yet                             | Impact                                                                 |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| Per-operator RBAC or scoped permissions         | All authenticated operators share the same effective access level      |
| Token rotation or identity-provider integration | Token management is environment-configured and static                  |
| TLS termination inside the repo                 | Expected to be handled by deployment infrastructure                    |
| Distributed WebSocket authorization state       | Current realtime model is single-token and single-instance in behavior |
| Idempotency keys for command endpoints          | Duplicate submissions are not prevented at the API contract level      |

## Recommended Production Hardening

- Replace the shared operator token with a real identity provider or signed token model.
- Add RBAC so incident, alert, and administrative actions can be scoped by role.
- Terminate TLS in front of the services and externalize secrets into a proper secrets manager.
- Forward audit data and application logs into centralized monitoring and alerting systems.
- Add idempotency keys for write endpoints that may be retried by clients or intermediaries.
