# SoloCamiones

Local development monorepo for the SoloCamiones inventory and sales application.

## Prerequisites

- Node.js 22.12+ (CI/Docker use Node.js 22; local tests also run on Node.js 24)
- npm 11.19.1 (workspace override fixes; enforced for installation)
- PostgreSQL 14+ running locally

## Setup

If needed, update npm before installing dependencies:

```bash
npm install --global npm@11.19.1
```

```bash
npm ci
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

### First Administrator (local bootstrap)

After generating Prisma Client and applying migrations, run from the repository root
in an interactive terminal:

```bash
npm run bootstrap:admin
```

The command uses `DATABASE_URL` from the environment or the root `.env`. It asks for
name, username, optional phone/email, and a hidden password entered twice. Passwords
must have at least 6 Unicode characters and are preserved exactly. Usernames are
trimmed and lowercased; blank contact fields become null. The role is always
`ADMINISTRATOR` and the account is active. No session is created.

The command rejects any existing user, including inactive users. It never updates
or resets existing credentials. A serializable transaction protects the empty-check
and creation against simultaneous executions: only one bootstrap can succeed.
After a concurrency conflict, inspect the database state before rerunning.

No arguments or piped credentials are accepted. Ctrl+C during input cancels without
creating an account. Exit codes: `0` success, `1` validation/database/conflict failure,
`130` input cancellation. Errors omit credentials, hashes and database connection
strings. If setup is incomplete, verify `DATABASE_URL` and run
`npm run db:migrate:deploy` before retrying. Do not erase users to rerun bootstrap.

This creates a PostgreSQL account only. The web still uses mock login until the
authentication HTTP integration milestones. Automated bootstrap tests use only
`DATABASE_URL_TEST` and do not create the development administrator.

### Available commands

| Command | Description |
|---|---|
| `npm run dev` | Start API (port 3000) and web (port 5173) |
| `npm run build` | Build API and web |
| `npm run typecheck` | TypeScript check for all workspaces |
| `npm run lint` | ESLint for all workspaces |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Create/apply migrations in development |
| `npm run db:migrate:deploy` | Apply existing migrations (CI/local smoke) |
| `npm run bootstrap:admin` | Create the first Administrator interactively in an empty user database |

## Local URLs

- Web: http://localhost:5173
- API liveness: http://localhost:3000/api/health/live
- API readiness: http://localhost:3000/api/health/ready

The Vite dev server proxies `/api/*` to the API.

### API tests

Unit tests do not require a running PostgreSQL server:

```bash
npm run test:unit -w @truck-parts/api
```

`npm run test:watch -w @truck-parts/api` watches unit tests only. The full API
command, `npm run test -w @truck-parts/api`, runs unit tests followed by integration
tests, including the database reset described below.

For integration tests, start the database service (`docker compose up -d db`) and
create a separate `truck_parts_test` database if it does not already exist. Set
`DATABASE_URL_TEST` in your local `.env` to that database using the published
PostgreSQL port (5433 in `.env.example`), then run:

```bash
npm run test:integration -w @truck-parts/api
```

The test setup validates `DATABASE_URL_TEST` before assigning it to Prisma's
`DATABASE_URL`. If both URLs are configured, their database names must differ;
different credentials, host aliases or schemas are not sufficient isolation.
A test-only environment may supply just `DATABASE_URL_TEST`.
Without it, the setup removes the development connection fallback and PostgreSQL
integration tests fail explicitly. Invalid URLs also fail without printing credentials.

The integration command resets the disposable test database and reapplies every
committed migration before running the suite. It then checks `/api/health/live` and
`/api/health/ready`. An unreachable test database fails the suite instead of silently
skipping it. Do not point `DATABASE_URL_TEST` to a database whose data must be kept.

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

## Pull request checks

The **CI R1** workflow checks pull requests into `main` and pushes to `main` using
Node.js 22, npm 11.19.1 and a disposable PostgreSQL 16 service. It runs lint, typechecking,
unit/integration/component tests, build and dependency audit. No local database
credentials or deployment secrets are needed.

The repository owner must require **R1 quality** in the protection for `main` to
block merges on failure. See [the M4 CI guide](docs/plans_api/milestone-4-ci.md) for
setup instructions, local commands, and the smoke checks that M6–M7 must add.

## Administración de usuarios — M8

El backend incluye gestión de cuentas y recuperación autorizada. Aplicar migraciones locales con `npm run db:migrate:deploy` antes de iniciar la API. El frontend continúa en mock hasta M10–M11.

Contrato HTTP, ejemplos JSON y secuencias de alta, cambio obligatorio, recuperación y desactivación: [guía M8](docs/plans_api/milestone-8-verification.md). Las cuentas existentes conservan sus contraseñas; nuevas cuentas administrativas usan `solocamiones` y deben cambiarla. No hay recuperación por correo ni comando local de recuperación.
