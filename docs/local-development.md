# Local Development

The repository is designed to be easy to run locally while still feeling like a production-style multi-service backend.

Related docs: [README](../README.md), [Architecture](architecture.md), [Deployment Notes](deployment-notes.md)

## Prerequisites

- Node.js 22+
- npm 10+
- Docker and Docker Compose

## Environment Setup

Create a local environment file:

```bash
cp .env.example .env
```

PowerShell equivalent:

```powershell
Copy-Item .env.example .env
```

Then install dependencies:

```bash
npm install
```

## Preferred Development Flow

### 1. Start infrastructure dependencies

```bash
docker compose up -d postgres rabbitmq redis
```

### 2. Run migrations and seed data

```bash
npm run db:setup
```

What `db:setup` does:

- waits for PostgreSQL to become available
- runs TypeORM migrations
- seeds example data only if the `jobs` table is empty

### 3. Run application services locally

Start each runtime in its own terminal:

```bash
npm run start:dev:api
npm run start:dev:processing
npm run start:dev:realtime
```

This mode is the best fit for active repository review because it keeps the service boundaries visible.

## Full Docker Mode

If you want the entire stack containerized:

```bash
docker compose up --build -d
```

In this mode:

- `db-setup` runs before the application containers start
- `nginx` exposes a single local proxy entry point
- PostgreSQL, RabbitMQ, and Redis stay inside the Compose topology

## Local Ports and Endpoints

| Service                 | Local address                         |
| ----------------------- | ------------------------------------- |
| API gateway             | `http://localhost:3001/api/v1`        |
| Swagger UI              | `http://localhost:3001/api/docs`      |
| Realtime gateway health | `http://localhost:3002/api/v1/health` |
| Realtime namespace      | `ws://localhost:3002/realtime`        |
| Nginx proxy             | `http://localhost:8083`               |
| PostgreSQL              | `localhost:5435`                      |
| RabbitMQ AMQP           | `localhost:5673`                      |
| RabbitMQ management UI  | `http://localhost:15673`              |
| Redis                   | `localhost:6382`                      |

## Default Local Operator Credentials

| Field              | Value                                            |
| ------------------ | ------------------------------------------------ |
| `x-operator-token` | `ops-local-token`                                |
| `x-operator-id`    | Any non-empty identifier such as `demo-operator` |
| WebSocket token    | `ops-local-token`                                |

## Smoke-Test Path

### API health

```bash
curl http://localhost:3001/api/v1/health
```

### Create a job

```bash
curl -X POST http://localhost:3001/api/v1/jobs \
  -H "content-type: application/json" \
  -H "x-operator-token: ops-local-token" \
  -H "x-operator-id: demo-operator" \
  -d '{"name":"demo job","type":"demo","payload":{"failTimes":0}}'
```

### Inspect the processing summary

```bash
curl http://localhost:3001/api/v1/processing/status \
  -H "x-operator-token: ops-local-token" \
  -H "x-operator-id: demo-operator"
```

## Quality Commands

| Purpose          | Command                                |
| ---------------- | -------------------------------------- |
| Lint             | `npm run lint`                         |
| Format check     | `npm run format:check`                 |
| Type check       | `npm run typecheck`                    |
| Build            | `npm run build`                        |
| Test suite       | `npm run test:ci`                      |
| Compose logs     | `docker compose logs -f`               |
| Compose teardown | `docker compose down --remove-orphans` |

## Reviewer Notes

- Running the API, worker, and realtime services separately is recommended because it makes the architecture legible.
- Seed data is intentionally operational in tone, with existing jobs, alerts, incidents, notifications, and audit entries.
- The realtime gateway is easiest to inspect with a small Socket.IO client or browser-based test harness connected to `/realtime`.
