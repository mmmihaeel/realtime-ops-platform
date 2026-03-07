# WebSocket Flow

## Endpoint and Auth

- URL: `ws://localhost:3002/realtime`
- Transport: Socket.IO
- Required auth token: `OPERATOR_API_TOKEN`

Example handshake auth payload:

```json
{
  "token": "ops-local-token",
  "operatorId": "operator-1"
}
```

If the token is invalid, the gateway disconnects the socket during connection setup.

## Subscriptions

After connect, clients can subscribe to channels:

- `jobs`
- `alerts`
- `incidents`
- `notifications`

Client event:

```json
{
  "channels": ["jobs", "alerts"]
}
```

Unknown channel names are ignored, and only supported channels are joined.

## Published Topics

- `job.created`
- `job.processing`
- `job.completed`
- `job.failed`
- `alert.raised`
- `alert.acknowledged`
- `incident.updated`
- `notification.created`

## Event Envelope

```json
{
  "topic": "job.completed",
  "payload": {
    "jobId": "...",
    "attemptNumber": 1
  },
  "emittedAt": "2026-03-07T12:00:00.000Z"
}
```

## Typical Reviewer Demo

1. Connect a client with valid token and subscribe to `jobs` and `alerts`.
2. Create a job through the API.
3. Observe `job.created` and `job.processing` followed by `job.completed` or `job.failed`.
4. If failed, observe `alert.raised` and `notification.created`.

This makes realtime behavior directly visible without additional tooling.

## Delivery Model

Events are always emitted to the operator room and additionally to topic-specific channel rooms when subscribed.

## Verification Path

The repository includes automated tests for routing and unauthorized handshake behavior plus manual Docker smoke validation.
