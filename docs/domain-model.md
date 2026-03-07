# Domain Model

## Core Entities

## Job

Represents asynchronous operational work.

- `status`: `queued | processing | completed | failed`
- `attemptCount`, `maxAttempts`
- `payload` (JSONB) with job-specific input and deterministic failure controls

## ProcessingAttempt

Tracks each execution attempt for a job.

- `attemptNumber`
- `status`: `started | succeeded | failed`
- `startedAt`, `finishedAt`, `durationMs`, `errorMessage`

## Alert

Signals operational problems.

- `severity`: `low | medium | high | critical`
- `status`: `open | acknowledged | resolved`
- optional `jobId`

## Incident

Operator-managed workflow object for significant alerts.

- optional `alertId` (unique link)
- `status`: `open | acknowledged | resolved`
- assignment-style metadata (`acknowledgedBy`, `resolvedBy`)

## Notification

Operator-facing event feed.

- `type`: `job_status | alert | incident | system`
- `message`, `metadata`

## OperatorAction

Captures explicit operator commands.

- `operatorId`, `action`, `targetType`, `targetId`, `payload`

## AuditEntry

Immutable record of system/operator actions.

- actor (`system` or `operator`)
- action + entity context
- metadata for event detail

## Relationships

- `Job 1..* ProcessingAttempt`
- `Job 0..* Alert`
- `Alert 0..1 Incident`

## State Rules

- Job retry allowed only from `failed` when `attemptCount < maxAttempts`.
- Incident acknowledge blocked when incident is already `resolved`.
- Incident resolve allowed from `open` or `acknowledged`.
- Alert status aligns with incident transitions when linked.
