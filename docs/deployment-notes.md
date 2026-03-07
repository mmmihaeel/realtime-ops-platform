# Deployment Notes

## Container Topology

- `api-gateway`
- `processing-service`
- `realtime-gateway`
- `postgres`
- `rabbitmq`
- `redis`
- optional `nginx`

## Startup Strategy

`db-setup` runs migrations and seed checks before application services start.

## Runtime Configuration

Provide environment variables for:

- PostgreSQL connection
- RabbitMQ connection
- Redis connection
- operator auth token
- rate limit policy
- realtime queue name

## Horizontal Scaling

- API gateway can scale horizontally behind a reverse proxy.
- Processing service can scale by running additional consumers.
- Realtime gateway scaling requires shared Socket.IO adapter for cross-instance fanout (future enhancement).

## Observability Guidance

- centralize container logs
- add request metrics and queue depth metrics
- monitor open incidents and failed jobs as SLO indicators

## Backup and Recovery

- PostgreSQL volume backup schedule
- RabbitMQ durable queue strategy
- Redis treated as ephemeral coordination/cache layer
