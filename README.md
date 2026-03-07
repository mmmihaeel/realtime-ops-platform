# Realtime Ops Platform

Realtime Ops Platform is a NestJS microservices backend for operational workflows where jobs are processed asynchronously, failures raise actionable alerts, incidents are managed by operators, and live updates are streamed to WebSocket clients.

## Business Context

Operations teams often need one place to track asynchronous work, react to failures quickly, and coordinate incident handling with a complete audit trail. This project models that workflow end to end using production-style backend patterns.

## Feature Highlights

- Queue-backed job execution with status transitions (`queued`, `processing`, `completed`, `failed`)
- Retry workflow for failed jobs with guardrails on max attempts
- Alert and incident lifecycle management with valid operator transitions
- Notification feed for meaningful operational events
- Full audit trail for system actions and operator commands
- Real-time event fanout over WebSockets for jobs, alerts, incidents, and notifications
- Redis-backed request rate limiting and processing locks
- Structured API responses, validation, pagination, filtering, and sorting
- Docker-first local environment with PostgreSQL, RabbitMQ, Redis, and Nginx

## Technology Stack

- Node.js 22
- TypeScript (strict mode)
- NestJS
- PostgreSQL + TypeORM migrations
- RabbitMQ (`amqplib`)
- Redis (`ioredis`)
- WebSockets (`@nestjs/websockets` + Socket.IO)
- Jest + Supertest
- ESLint + Prettier
- Docker + Docker Compose
- GitHub Actions CI

## Architecture Summary

The platform is split into three service processes:

- `api-gateway`: authenticated REST API (`/api/v1/...`), DTO validation, operator commands/queries
- `processing-service`: RabbitMQ consumer for job execution, retries, alerts/incidents side effects
- `realtime-gateway`: WebSocket server plus RabbitMQ event consumer for fanout

Shared libraries hold domain entities, business services, and infrastructure adapters:

- `libs/core`: entities, enums, shared domain types
- `libs/application`: use-case style business services
- `libs/database`: TypeORM config + migrations
- `libs/messaging`: RabbitMQ service and topic constants
- `libs/redis`: Redis client and lock service
- `libs/auth`, `libs/common`: auth guards, rate limiting, response/error shaping

See [docs/architecture.md](docs/architecture.md) for detailed internals.

## Service Responsibilities

### API Gateway

- Job create/list/detail/retry/status endpoints
- Alert create/list/detail endpoints
- Incident acknowledge/resolve endpoints
- Notification and audit entry query endpoints
- Processing summary and health endpoints
- Swagger docs (`/api/docs`)

### Processing Service

- Consumes `jobs.processing` queue messages
- Executes job attempts with deterministic failure rules
- Writes attempts, job final state, and side effects
- Raises alerts and incidents on critical failures
- Publishes lifecycle events to RabbitMQ topic exchange

### Realtime Gateway

- Authenticated Socket.IO namespace (`/realtime`)
- Client subscriptions (`jobs`, `alerts`, `incidents`, `notifications`)
- Event broadcast for `job.*`, `alert.*`, `incident.updated`, `notification.created`

## Auth Model and Current Limitations

- API auth uses two headers: `x-operator-token` and `x-operator-id`.
- WebSocket auth validates the same token during handshake.
- This is intentionally lightweight for a portfolio project and keeps operational flows easy to run locally.

Current limitations:

- no per-operator roles/permissions
- single shared token model
- no token rotation endpoint (token is environment-configured)

## Job Processing Flow

1. Operator creates a job (`POST /api/v1/jobs`).
2. API persists the job and publishes a message to `jobs.processing`.
3. Processing service consumes the message, acquires a Redis lock, and starts an attempt.
4. Attempt outcome updates job status and writes audit + notification records.
5. On failures, an alert is raised; on critical conditions, an incident is created.
6. Realtime events are published to RabbitMQ and broadcast to WebSocket clients.

## Alert and Incident Flow

- Alerts can be raised by processing side effects or manually by operators.
- Critical alerts can create incidents immediately.
- Incidents support operational transitions:
  - `open -> acknowledged`
  - `open|acknowledged -> resolved`
- Every transition is auditable.

## WebSocket Realtime Model

- URL: `ws://localhost:3002/realtime`
- Auth: `token` must match `OPERATOR_API_TOKEN`
- Optional subscription channels: `jobs`, `alerts`, `incidents`, `notifications`
- Event topics:
  - `job.created`
  - `job.processing`
  - `job.completed`
  - `job.failed`
  - `alert.raised`
  - `alert.acknowledged`
  - `incident.updated`
  - `notification.created`

Detailed contract examples are in [docs/websocket-flow.md](docs/websocket-flow.md).

## Quick Start (Docker)

```bash
cp .env.example .env
docker compose up --build -d
```

Endpoints:

- API: `http://localhost:3001/api/v1`
- Swagger: `http://localhost:3001/api/docs`
- Realtime Gateway: `http://localhost:3002`
- Nginx proxy: `http://localhost:8083`
- RabbitMQ UI: `http://localhost:15673`

Default operator headers for API calls:

- `x-operator-token: ops-local-token`
- `x-operator-id: <your-operator-id>`

## Environment Setup

Required variables are defined in [.env.example](.env.example):

- `DATABASE_URL`
- `RABBITMQ_URL`
- `REDIS_URL`
- `OPERATOR_API_TOKEN`
- `RATE_LIMIT_MAX_REQUESTS`
- `RATE_LIMIT_WINDOW_SECONDS`
- `REALTIME_EVENTS_QUEUE`

## Local Development Workflow

1. Start dependencies:

```bash
docker compose up -d postgres rabbitmq redis
```

2. Apply schema and seed:

```bash
npm install
npm run db:setup
```

3. Run services in separate terminals:

```bash
npm run start:dev:api
npm run start:dev:processing
npm run start:dev:realtime
```

See [docs/local-development.md](docs/local-development.md) for Linux-oriented workflow details.

## Testing and Quality Checks

```bash
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test:ci
```

Test suite includes:

- job creation, retry, validation, and status coverage
- alert/incident transition flow
- auth protection checks
- audit and notification query checks
- realtime routing verification

## API Overview

Core endpoints:

- `GET /api/v1/health`
- `POST /api/v1/jobs`
- `GET /api/v1/jobs`
- `GET /api/v1/jobs/:id`
- `GET /api/v1/jobs/:id/status`
- `POST /api/v1/jobs/:id/retry`
- `POST /api/v1/alerts`
- `GET /api/v1/alerts`
- `GET /api/v1/alerts/:id`
- `POST /api/v1/incidents/:id/acknowledge`
- `POST /api/v1/incidents/:id/resolve`
- `GET /api/v1/notifications`
- `GET /api/v1/audit-entries`
- `GET /api/v1/processing/status`

See [docs/api-overview.md](docs/api-overview.md) for request/response conventions.

## Demo Walkthrough

1. Create a job with `failTimes: 0` and watch it complete.
2. Create a job with high `failTimes` and observe `job.failed` + `alert.raised` events.
3. Retry the failed job.
4. Raise a critical alert manually and resolve the linked incident.
5. Query audit history and notifications.

### Local Demo Commands

```bash
curl -X POST http://localhost:3001/api/v1/jobs \
  -H \"content-type: application/json\" \
  -H \"x-operator-token: ops-local-token\" \
  -H \"x-operator-id: demo-operator\" \
  -d '{\"name\":\"demo job\",\"type\":\"demo\",\"payload\":{\"failTimes\":0}}'
```

```bash
curl \"http://localhost:3001/api/v1/jobs?page=1&limit=10\" \
  -H \"x-operator-token: ops-local-token\" \
  -H \"x-operator-id: demo-operator\"
```

```bash
curl -X POST http://localhost:3001/api/v1/alerts \
  -H \"content-type: application/json\" \
  -H \"x-operator-token: ops-local-token\" \
  -H \"x-operator-id: demo-operator\" \
  -d '{\"severity\":\"critical\",\"title\":\"demo alert\",\"description\":\"manual incident test\",\"createIncident\":true}'
```

Use a Socket.IO client connected to `ws://localhost:3002/realtime` (token: `ops-local-token`) and subscribe to `jobs` and `alerts` to watch events during the same flow.

## Repository Structure

```text
apps/
  api-gateway/
  processing-service/
  realtime-gateway/
libs/
  application/
  auth/
  common/
  core/
  database/
  messaging/
  redis/
docs/
scripts/
tests/
```

## Security Notes

- Header token auth for management endpoints
- WebSocket token validation during handshake
- Redis-backed rate limiting on API routes
- Request DTO validation with strict whitelisting
- Internal state changes captured via audit entries

Details: [docs/security.md](docs/security.md)

## Deployment Notes

Containerized deployment details and operational notes are documented in [docs/deployment-notes.md](docs/deployment-notes.md).

## Roadmap

Planned improvements are tracked in [docs/roadmap.md](docs/roadmap.md).
