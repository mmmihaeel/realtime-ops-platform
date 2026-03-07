# Local Development

## Prerequisites

- Docker + Docker Compose
- Node.js 22
- npm 10+

## Linux-Friendly Setup

```bash
cp .env.example .env
npm install
```

## Start Dependencies Only

```bash
docker compose up -d postgres rabbitmq redis
```

## Apply Schema and Seed Data

```bash
npm run db:setup
```

## Run Services Locally

Use three terminals:

```bash
npm run start:dev:api
npm run start:dev:processing
npm run start:dev:realtime
```

## Full Docker Mode

```bash
docker compose up --build -d
```

## Useful Commands

```bash
npm run lint
npm run typecheck
npm run test:ci
npm run build
docker compose logs -f
docker compose down --remove-orphans
```

## Default Local Ports

- API: `3001`
- Realtime: `3002`
- Nginx: `8083`
- PostgreSQL: `5435`
- RabbitMQ: `5673` / UI `15673`
- Redis: `6382`
