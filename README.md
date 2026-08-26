# Truck Parts System

Local development monorepo for the truck parts inventory and sales application.

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

```bash
npm install
cp .env.example .env
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start API (port 3000) and web (port 5173) |
| `npm run build` | Build API and web |
| `npm run typecheck` | TypeScript check for all workspaces |
| `npm run lint` | ESLint for all workspaces |

## Local URLs

- Web: http://localhost:5173
- API health: http://localhost:3000/api/health

The Vite dev server proxies `/api/*` to the API.

## Project structure

```text
apps/
  api/   Express + TypeScript backend
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

See `docs/plans/plan-001.md` for the active Release 1 implementation plan.
