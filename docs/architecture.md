# Architecture

## Overview

Realtime Ops Platform is an event-driven NestJS backend split into three runtime services and a shared library layer.

## Runtime Services

- `api-gateway` (HTTP): operator command/query API under `/api/v1`
- `processing-service` (worker): asynchronous job execution from RabbitMQ queues
- `realtime-gateway` (HTTP + WebSocket): live event delivery to subscribed clients

## Infrastructure Components

- PostgreSQL: system-of-record persistence and audit history
- RabbitMQ:
  - queue: `jobs.processing`
  - topic exchange: `ops.events`
- Redis:
  - processing locks (`job-processing-lock:{jobId}`)
  - request rate limiting counters
- Nginx (optional local proxy): API and WebSocket forwarding

## Module Boundaries

- `libs/core`: entities/enums/domain contracts
- `libs/application`: use-case services (`JobService`, `JobProcessorService`, etc.)
- `libs/database`: TypeORM setup + migration classes
- `libs/messaging`: RabbitMQ lifecycle + publish/consume methods
- `libs/redis`: Redis lifecycle + lock helper
- `libs/auth`: operator token guard + rate limiting guard
- `libs/common`: response interceptor + exception filter + shared DTOs

## Eventing Design

### Command Side

REST commands in `api-gateway` persist records and enqueue processing work (`jobs.processing`).

### Processing Side

`processing-service` consumes queue messages, executes business logic, writes state changes, and emits topic events.

### Realtime Side

`realtime-gateway` consumes `ops.events` and broadcasts events to websocket rooms and operator sessions.

## Realtime Visibility Path

1. API and worker publish lifecycle topics to `ops.events`.
2. Realtime gateway consumes the topics using `REALTIME_EVENTS_QUEUE`.
3. Gateway maps topics to channel rooms:
   - `job.*` -> `jobs`
   - `alert.*` -> `alerts`
   - `incident.*` -> `incidents`
   - `notification.*` -> `notifications`
4. Every event is also emitted to the `operators` room for broad operational visibility.

## Data Access Pattern

Business services interact with TypeORM repositories through explicit service methods. Controllers stay thin and map validated DTOs to use-case calls.

## Error and Response Pattern

- Global exception filter returns structured error payloads.
- Global response interceptor wraps successful results in `{ success, data, meta? }`.

## Operational Sequence

1. `POST /jobs` writes job record + audit + notification.
2. API publishes job processing message.
3. Worker transitions job to `processing` and writes processing attempt.
4. Worker sets final state and triggers side effects.
5. Worker publishes lifecycle events.
6. Realtime gateway fans out event payloads to clients.

## Why This Split

- API layer stays request-focused and thin.
- Processing concerns stay queue-driven and resilient to API latency.
- Realtime concerns remain isolated so websocket fanout changes do not impact command/query handlers.
