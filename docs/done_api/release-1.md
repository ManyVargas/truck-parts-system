# Release 1 — Registro de lo implementado

**Release:** Application Foundation and Access (Local Development)  
**Plan de referencia:** [`../plans_api/plan-001.md`](../plans_api/plan-001.md)  
**Estado:** en progreso (Milestones 1–3 completados; M4 implementado y verificado localmente, con auditoría y verificación en GitHub pendientes)

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
| `GET /api/health/ready` | PostgreSQL alcanzable **y** migraciones aplicadas | `200 { "status": "ok", "database": "up", "migrations": "up_to_date" }` | `503` si BD caída, migraciones pendientes (`pending`) o no verificables (`unavailable`) |

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
- Readiness también verifica migraciones locales vs `_prisma_migrations` (`up_to_date` / `pending` / `unavailable`)

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

**Estado:** completado  
**Fecha:** 2026-09-03

### Objetivo cumplido

Instalar infraestructura transversal de errores de aplicación, logging estructurado, validación runtime (Zod) y un contrato HTTP estable. Sin Access/Users ni integración web.

### Qué se entregó

#### Taxonomía y mapper
- `apps/api/src/infrastructure/errors/` — `AppError` + `mapErrorToHttp`
- Códigos: `VALIDATION`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `CONFLICT`, `INTERNAL`
- Envelope: `{ "error": { "code", "message", "errorId?", "details?" } }`
- `errorId` **solo** en 500; mensaje de 500 genérico (sin stack ni SQL)
- JSON malformado → 400 `VALIDATION`
- Cuerpo demasiado grande (body-parser) → 413 `PAYLOAD_TOO_LARGE` (cliente, sin log unexpected)
- Charset/encoding JSON no admitido → 415 `UNSUPPORTED_MEDIA_TYPE`

#### Middleware HTTP
- Request ID (`X-Request-Id` entrante o UUID generado)
- `requestPath` capturado a la entrada (antes de que los routers recorten `req.path`)
- Helmet
- Logger de request (método, `requestPath`, status, duración, requestId; sin bodies)
- `validate()` con Zod en routes
- 404 de ruta desconocida con el mismo envelope
- Error handler Express de 4 argumentos

#### Logging
- Pino; `LOG_LEVEL` (`silent` en `NODE_ENV=test`)
- 500 registra `requestId` + `errorId` + error interno

#### Tests
- Unit: mapeo error → status/código
- Integration: 400 Zod (router **solo de tests**), 413/415, snapshot de path, 409, 404, 500 + `errorId`, Helmet, `X-Request-Id`
- `createApp({ extraRouters })` es el seam de tests; no hay endpoint público de probe

### Decisiones de implementación (cerradas con el owner)

| Decisión | Elección |
|---|---|
| Envelope | Anidado bajo `error` |
| `errorId` | Solo 500 |
| Headers | Helmet |
| Cómo probar 400 | Router/schema solo en tests |
| Rutas inexistentes | 404 `NOT_FOUND` con el envelope |
| 413 / 415 | Códigos propios (`PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`) |

### Validación

- `npm run typecheck` / tests unit + integration del contrato de errores
- Health live/ready **no** cambian de payload (503 de BD sigue siendo readiness, no `AppError`)

### Fuera de alcance (intencional)

- Login, User/Session, policies, CI GitHub Actions (M4)
- Swap `VITE_USE_MOCK_API`
- Mensajes de error en español (el `code` es el contrato para M10)

---

## Milestone 4 — Test harness y CI baseline

**Estado:** implementado y verificado localmente; cierre completo pendiente de auditoría y verificación en GitHub

**Fecha:** 2026-09-03

### Objetivo implementado

Completar el harness existente de Vitest + Supertest, ejecutar integraciones contra PostgreSQL real y preparar CI sin despliegue. Se reutilizaron las pruebas y helpers incorporados en milestones anteriores; M4 añadió aislamiento de la BD, preparación reproducible y un workflow para el monorepo.

### Qué se entregó

#### Configuración y aislamiento de pruebas

- `apps/api/tests/helpers/environment.ts` — carga del entorno y validación de URLs PostgreSQL, con errores que no exponen credenciales.
- `apps/api/tests/setup.ts` — configura `DATABASE_URL` para Prisma a partir de `DATABASE_URL_TEST` antes de cargar las pruebas.
- Si falta `DATABASE_URL_TEST`, se elimina el fallback hacia la conexión de desarrollo; las unitarias pueden ejecutarse sin PostgreSQL y las integraciones fallan explícitamente.
- Si ambas URLs están configuradas, deben utilizar nombres de base distintos. Cambiar usuario, alias de host o schema no se acepta como prueba de aislamiento.
- `apps/api/vitest.config.ts` — selección de pruebas unitarias.
- `apps/api/vitest.integration.config.ts` — selección de integraciones, preparación global y ejecución secuencial de archivos que comparten la BD.
- `apps/api/tsconfig.test.json` — incluye también la configuración de integración en el chequeo de TypeScript.

#### PostgreSQL y migraciones de test

- El owner confirmó PostgreSQL 16 en Docker Compose y la existencia de `truck_parts_test`, **desechable para pruebas**. Se verificaron conexiones separadas para desarrollo y test en el puerto local 5433.
- `apps/api/tests/integration/setup.ts` comprueba la configuración y conectividad, y prepara la BD una sola vez antes de la suite.
- `apps/api/tests/helpers/database.ts` ejecuta `prisma migrate reset --force --skip-generate` únicamente con la URL de test validada. El comando reconstruye el esquema y reaplica las migraciones versionadas.
- **Las integraciones borran los datos existentes de la BD de test.** Esta conducta quedó documentada y se utilizó sobre la base desechable confirmada por el owner.
- Se eliminó `describe.skipIf` de las integraciones de health: una BD inaccesible ahora hace fallar la ejecución, en vez de producir un resultado verde con pruebas omitidas.

#### Pruebas y comandos

- `tests/unit/infrastructure/test-environment.test.ts` — selección de la BD correcta, rechazo de URLs inválidas, reutilización de la BD de desarrollo y errores sin credenciales.
- `tests/unit/health/routes.test.ts` — liveness independiente de la BD; readiness HTTP `503` para BD caída y migraciones `pending`/`unavailable`, simulando esas condiciones en el repositorio.
- `tests/integration/health/routes.test.ts` — liveness y readiness `200` contra la aplicación y PostgreSQL real, después de reconstruir la BD.
- Se conservó la cobertura del contrato HTTP de M3.
- `npm run test -w @truck-parts/api` ejecuta unitarias y luego integraciones. `test:watch` observa solamente unitarias; `test:integration` usa la configuración específica con reset de BD.

#### CI y smoke Release 1

- `.github/workflows/ci.yml` — workflow **CI R1**, con check **R1 quality**, para PRs hacia `main`, pushes a `main` y ejecución manual.
- Runner Ubuntu 24.04, Node.js 22 y un servicio PostgreSQL 16 desechable por ejecución. No necesita credenciales de la BD local.
- Secuencia: instalar npm fijado → `npm ci` → generar Prisma → lint → typecheck de aplicaciones y pruebas → unitarias → migraciones limpias e integraciones → componentes web → build → `npm audit --audit-level=high`.
- Permisos de lectura del repositorio, límite de tiempo del job y cancelación de ejecuciones anteriores del mismo PR cuando llega otro commit.
- Smoke automatizado en M4: migraciones limpias, `/api/health/live` y `/api/health/ready`. Login, sesión, logout y denegaciones/proyección por rol quedan documentados para M6–M7; no se añadieron stubs de autenticación que simulen cobertura.
- `README.md`, `docs/plans_api/plan-001.md` y [`../plans_api/milestone-4-ci.md`](../plans_api/milestone-4-ci.md) documentan comandos, alcance y configuración de GitHub.

### Corrección complementaria de dependencias

Durante la preparación de CI, la auditoría identificó hallazgos en `deepmerge-ts` (a través de Prisma) y `qs`. El owner autorizó resolverlos preservando reglas y arquitectura. Estos ajustes acompañan a M4, pero se distinguen del harness y CI originales:

| Cambio | Motivo y alcance |
|---|---|
| `qs` 6.15.3 → 6.16.0 en `package-lock.json` | Versión corregida compatible con los rangos ya declarados por Express, body-parser y Superagent |
| Override raíz de `deepmerge-ts` a 8.0.0, limitado a `@prisma/config@6.19.3` | Corregir la dependencia interna manteniendo Prisma y Prisma Client en 6.19.3 |
| npm 11.19.1 declarado en `package.json` | npm 11.17 ignoraba el override al atravesar el workspace; la versión nueva aplica el árbol esperado |
| `.npmrc` con `engine-strict=true` y requisito npm `>=11.19.1 <12` | Rechazar instalaciones con un gestor incompatible antes de modificar el lockfile |
| Ajustes en los Dockerfiles existentes de API/web y en CI | Instalar npm 11.19.1 e incluir `.npmrc` para reproducir la resolución de dependencias |
| `tests/fixtures/prisma.config.ts` y `tests/unit/infrastructure/prisma-config.test.ts` | Validar la compatibilidad del override invocando la CLI real de Prisma con una configuración de prueba |

El archivo de `fixtures` se utiliza únicamente en pruebas y no sustituye la configuración de la aplicación. La prueba cubre la carga de configuración y validación del esquema; las integraciones verifican además las migraciones. Se debe reevaluar el override cuando Prisma publique una corrección propia. No se aplicó `npm audit fix --force` ni se añadieron excepciones al gate de auditoría.

El owner actualizó posteriormente su npm global a **11.19.1**, y se comprobó que esa versión quedó activa. Las herramientas temporales utilizadas para verificar la actualización se eliminaron; la carpeta vacía `scripts` ya existía antes de este trabajo.

### Validación realizada

| Verificación | Resultado |
|---|---|
| Instalación limpia con `npm ci` y npm 11.19.1 | OK |
| Árbol instalado mediante `npm ls` | Prisma/Client 6.19.3, deepmerge-ts 8.0.0, qs 6.16.0; sin dependencias inválidas con npm 11.19.1 |
| Generación de Prisma y carga real de configuración | OK |
| Unitarias API | 43 aprobadas |
| Integraciones API con PostgreSQL real | 15 aprobadas |
| Unitarias web | 256 aprobadas |
| Integraciones web | 68 aprobadas |
| Componentes web | 119 aprobadas |
| Total del monorepo | **501 pruebas aprobadas** |
| Typecheck de aplicaciones y pruebas | OK |
| Lint | Sin errores; 4 advertencias preexistentes de React Fast Refresh |
| Build API + web | OK; advertencia preexistente por tamaño del bundle web |
| Conexión de test deliberadamente inaccesible | La suite falla explícitamente antes de ejecutar pruebas |
| Instalación con npm 11.17 | Rechazada con `EBADENGINE`; lockfile sin cambios |
| Sintaxis del workflow YAML | Parseo correcto |

Las comprobaciones locales se realizaron en Windows con Node.js 24. La ejecución real del workflow en Ubuntu/Node.js 22 sigue pendiente; las pruebas locales no se presentan como una ejecución verde de GitHub Actions.

### Pendientes y acuerdo de continuidad

1. **Auditoría completa:** las versiones corregidas están instaladas, pero las consultas posteriores de `npm audit --audit-level=high` no concluyeron por timeouts. El owner también obtuvo **HTTP 503 Service Unavailable** del endpoint de auditoría de npm. Esto no equivale a una auditoría sin vulnerabilidades.
2. **Mantener el gate:** la auditoría sigue siendo obligatoria en CI, con umbral alto; debe reintentarse cuando responda el registro y verificarse antes del merge de Release 1.
3. **PR al final de Release 1:** el owner realizará el PR cuando complete el release, no al terminar M4. Hasta entonces puede continuar el desarrollo local con estas verificaciones pendientes registradas.
4. **GitHub:** comprobar la primera ejecución de **CI R1**, configurar **R1 quality** como check obligatorio para `main` y verificar que un fallo impida el merge. No se afirma que la protección de rama ya esté configurada.

Por tanto, M4 queda **implementado y verificado localmente**, pero su definición de terminado completa permanece pendiente de la auditoría y de la verificación del gate en GitHub.

### Fuera de alcance

- Modelos User/Session y bootstrap del primer administrador (M5).
- Endpoints de autenticación y autorización (M6–M7).
- Integración HTTP del frontend: `VITE_USE_MOCK_API` permanece en modo mock.
- Despliegue, staging o producción.

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
