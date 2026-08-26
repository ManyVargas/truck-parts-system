# Release 1 — Registro de lo implementado

**Release:** Application Foundation and Access (Local Development)  
**Plan de referencia:** [`../plans/plan-001.md`](../plans/plan-001.md)  
**Estado:** en progreso (Milestones 1–2 completados)

Este archivo documenta **qué se entregó** en cada milestone de Release 1, a medida que se completan.  
No sustituye a `plan-001.md` (plan de ejecución) ni a los feature specs; es el registro histórico de implementación.

---

## Milestone 1 — Scaffold monorepo y convenciones

**Estado:** completado  
**Fecha:** 2026-08-25

### Objetivo cumplido

Crear la estructura mínima ejecutable del monolito modular (frontend + backend) con TypeScript, scripts de desarrollo y la convención feature-based, sin lógica de negocio ni base de datos.

### Qué se entregó

#### Raíz del monorepo
- `package.json` con **npm workspaces** (`apps/*`)
- Scripts: `dev`, `build`, `lint`, `typecheck`, `format`
- ESLint (flat config) + Prettier
- `.gitignore`, `.env.example`, `README.md` de arranque local
- `concurrently` para levantar API + web con un solo comando

#### Backend — `apps/api`
- Node.js + Express + TypeScript (ESM)
- Feature stub `health` siguiendo la convención:
  - `routes` → `controller` → `service` → `repository` → `validation` → `types`
- Endpoint inicial: `GET /api/health` (stub de liveness simple)
- `createApp()` separado de `index.ts` (preparado para tests futuros)
- Dev con `tsx watch`

#### Frontend — `apps/web`
- React + Vite + TypeScript
- Placeholder que consulta el health del API
- Proxy Vite: `/api` → `http://localhost:3000` (same-origin en local)

### Decisiones técnicas

| Decisión | Motivo |
|---|---|
| npm workspaces | Monorepo simple sin Turborepo/Nx |
| Express + Vite | Stack confirmado en `ARCHITECTURE_PLAN` / `DEVELOPMENT_PLAN` |
| Proxy Vite en local | Simula same-origin antes del despliegue |
| Feature `health` como plantilla | Fija la convención arquitectónica desde el día 1 |

### Validación

- `npm run typecheck` — OK
- `npm run build` — OK
- `npm run lint` — OK
- Smoke: `GET /api/health` respondía `{ "status": "ok", "service": "truck-parts-api" }`

### Fuera de alcance (intencional)

- PostgreSQL / Prisma
- Auth, usuarios, history
- Tests automatizados / CI
- Errores estructurados / logging / Zod

---

## Milestone 2 — PostgreSQL, Prisma y conectividad

**Estado:** completado (código listo; apply migrate + `ready=200` depende del `.env` local del owner)  
**Fecha:** 2026-08-25

### Objetivo cumplido

Conectar PostgreSQL local con Prisma, establecer el workflow de migraciones, cliente singleton con cierre graceful, y separar health en **liveness** vs **readiness**.

### Qué se entregó

#### Persistencia
- Prisma **6.x** (`@prisma/client` + CLI)
- `apps/api/prisma/schema.prisma` — baseline sin modelos de dominio
- Migración inicial: `apps/api/prisma/migrations/20260826000000_init/`
- Cliente singleton: `apps/api/src/infrastructure/database/`
- Carga de entorno: `apps/api/src/infrastructure/config/load-env.ts` (busca `.env` en raíz del monorepo, compatible con `src/` y `dist/`)
- Cierre graceful: `SIGINT` / `SIGTERM` → cierra HTTP + `prisma.$disconnect()`

#### Health actualizado
| Endpoint | Significado | Éxito | Fallo |
|---|---|---|---|
| `GET /api/health/live` | Proceso vivo | `200 { "status": "ok" }` | Proceso caído |
| `GET /api/health/ready` | PostgreSQL alcanzable (`SELECT 1`) | `200 { "status": "ok", "database": "up" }` | `503 { "status": "error", "database": "down" }` |

El frontend pasó a consultar `/api/health/live`.

#### Scripts
| Comando | Descripción |
|---|---|
| `npm run db:generate` | Genera Prisma Client |
| `npm run db:migrate` | Migraciones interactivas en desarrollo |
| `npm run db:migrate:deploy` | Aplica migraciones existentes |
| `npm run db:studio` | Prisma Studio (API workspace) |

`dotenv-cli` carga `../../.env` (raíz del monorepo) para los comandos Prisma.

#### Documentación
- `.env.example` con `DATABASE_URL` de ejemplo
- `README.md` actualizado (prerrequisitos PostgreSQL, health endpoints, scripts DB)

### Decisiones técnicas

| Decisión | Motivo |
|---|---|
| Prisma 6 (no 7) | Flujo clásico `url = env("DATABASE_URL")` en schema; Prisma 7 exige `prisma.config.ts` + adapters |
| Live vs Ready separados | Distinguir “proceso arriba” de “BD disponible” |
| Migración baseline vacía de dominio | Establece el workflow antes de User/Session (M5) |
| Ping de BD en `HealthRepository` | Persistencia fuera del controller; mantiene capas |

### Validación

- `npm run typecheck` — OK
- `npm run build` / generate — OK (tras liberar el lock del engine si la API estaba corriendo)
- `GET /api/health/live` — `200 {"status":"ok"}`
- `GET /api/health/ready` sin BD válida — `503 {"status":"error","database":"down"}`

### Pendiente operativo del owner (local)

1. Tener `.env` con `DATABASE_URL` real.
2. Crear la base `truck_parts_dev` (u otra coherente con la URL).
3. Ejecutar `npm run db:migrate:deploy`.
4. Verificar `GET /api/health/ready` → `200` con `"database":"up"`.

### Nota de entorno Windows

Si `npm run db:generate` falla con `EPERM` al renombrar `query_engine-windows.dll.node`, suele ser porque un proceso Node (API) tiene el archivo bloqueado. Detener la API y regenerar.

### Fuera de alcance (intencional)

- Modelos User/Session (Milestone 5)
- Taxonomía de errores, logging, Zod (Milestone 3)
- Test harness / CI (Milestone 4)
- Auth y gestión de usuarios (Milestones 6–11)

---

## Milestone 3 — Errores, logging, validación HTTP

**Estado:** pendiente

*(Se documentará al completar el milestone.)*

---

## Milestone 4 — Test harness y CI baseline

**Estado:** pendiente

*(Se documentará al completar el milestone.)*

---

## Milestone 5 — Modelo User + Session + bootstrap CLI

**Estado:** pendiente

*(Se documentará al completar el milestone.)*

---

## Milestone 6 — Autenticación: login, logout, sesiones

**Estado:** pendiente

*(Se documentará al completar el milestone.)*

---

## Milestone 7 — Autorización server-side

**Estado:** pendiente

*(Se documentará al completar el milestone.)*

---

## Milestone 8 — Gestión de usuarios Administrator (backend)

**Estado:** pendiente

*(Se documentará al completar el milestone.)*

---

## Milestone 9 — History mínimo Release 1

**Estado:** pendiente

*(Se documentará al completar el milestone.)*

---

## Milestone 10 — Frontend: login, logout, sesión y shell por rol

**Estado:** pendiente

*(Se documentará al completar el milestone.)*

---

## Milestone 11 — Frontend usuarios + exit gate Release 1

**Estado:** pendiente

*(Se documentará al completar el milestone.)*
