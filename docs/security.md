# Security

## API Access Control

- Management routes require `x-operator-token` and `x-operator-id`.
- Token validation is enforced by a global guard.
- Invalid tokens and missing operator IDs are rejected with `401`.

## WebSocket Access Control

- Handshake token is validated before socket admission.
- Unauthorized clients are disconnected.
- Channel subscriptions are restricted to known room names.

## Input Validation

- DTO validation with `class-validator` and strict Nest `ValidationPipe`:
  - `whitelist: true`
  - `forbidNonWhitelisted: true`
  - `transform: true`

## Rate Limiting

- Redis-backed fixed-window guard on authenticated API routes.
- Configurable via environment variables.
- Public routes bypass the rate-limit guard.

## Auditability

- System and operator actions are persisted in `audit_entries`.
- Operator commands are also written to `operator_actions`.

## Data Safety Considerations

- SQL schema includes foreign keys and indexes for operational queries.
- Sensitive internal fields are not exposed by dedicated internal endpoints.

## Recommended Production Hardening

- rotate and externalize operator tokens via secrets manager
- add per-operator RBAC and scoped permissions
- enable TLS termination and mTLS where required
- add structured security audit log forwarding

## Current Public Limitations

- authentication is token-based and not identity-provider integrated
- no per-route authorization policy beyond authenticated operator access
- websocket authentication uses the same shared token model as REST
