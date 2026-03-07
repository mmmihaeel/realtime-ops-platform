process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.API_PORT = process.env.API_PORT ?? '3001';
process.env.REALTIME_PORT = process.env.REALTIME_PORT ?? '3002';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5435/realtime_ops';
process.env.RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5673';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6382';
process.env.OPERATOR_API_TOKEN = process.env.OPERATOR_API_TOKEN ?? 'ops-local-token';
process.env.RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS ?? '1000';
process.env.RATE_LIMIT_WINDOW_SECONDS = process.env.RATE_LIMIT_WINDOW_SECONDS ?? '60';
process.env.REALTIME_EVENTS_QUEUE =
  process.env.REALTIME_EVENTS_QUEUE ?? 'realtime.gateway.events.test';

jest.setTimeout(45000);
