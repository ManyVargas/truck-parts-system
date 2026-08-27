# Truck Parts System

Local development monorepo for the truck parts inventory and sales application.

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 14+ running locally

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and set a real `DATABASE_URL` for your local PostgreSQL instance.

Create the development database if it does not exist:

```bash
# Example with psql
psql -U postgres -c "CREATE DATABASE truck_parts_dev;"
```

Generate the Prisma client and apply migrations:

```bash
npm run db:generate
npm run db:migrate:deploy
```

For interactive development migrations (creates new migration files):

```bash
npm run db:migrate
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start API (port 3000) and web (port 5173) |
| `npm run build` | Build API and web |
| `npm run typecheck` | TypeScript check for all workspaces |
| `npm run lint` | ESLint for all workspaces |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Create/apply migrations in development |
| `npm run db:migrate:deploy` | Apply existing migrations (CI/local smoke) |

## Local URLs

- Web: http://localhost:5173
- API liveness: http://localhost:3000/api/health/live
- API readiness: http://localhost:3000/api/health/ready

The Vite dev server proxies `/api/*` to the API.

### Health endpoints

| Endpoint | Meaning | Success | Failure |
|---|---|---|---|
| `GET /api/health/live` | Process is running | `200 { "status": "ok" }` | Process down |
| `GET /api/health/ready` | PostgreSQL reachable and migrations applied | `200 { "status": "ok", "database": "up", "migrations": "up_to_date" }` | `503` if DB is down or migrations are pending/unavailable |

## Project structure

```text
apps/
  api/   Express + TypeScript backend
    prisma/   Schema and migrations
    src/
      infrastructure/database/   Prisma client singleton
      features/health/           Liveness and readiness
  web/   React + Vite frontend
```

Backend features follow:

```text
feature/
  routes
  controller
  service
  repository
  validation
  types
```

See `docs/plans_api/plan-001.md` for the active Release 1 implementation plan.
