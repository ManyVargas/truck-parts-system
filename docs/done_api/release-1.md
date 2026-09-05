# Release 1 — Registro de lo implementado

**Release:** Application Foundation and Access (Local Development)  
**Plan de referencia:** [`../plans_api/plan-001.md`](../plans_api/plan-001.md)  
**Estado:** en progreso: M1–M3 y M5–M8 completados en local; M4 mantiene verificación GitHub pendiente. M9–M11 pendientes. Integraciones M6–M7 ejecutadas satisfactoriamente durante el cierre de M8.

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

**Estado:** implementado y verificado localmente; cierre completo pendiente de verificación en GitHub

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
| `npm audit --audit-level=high` | **0 vulnerabilidades** (2026-09-04, npm 11.19.1) |
| Conexión de test deliberadamente inaccesible | La suite falla explícitamente antes de ejecutar pruebas |
| Instalación con npm 11.17 | Rechazada con `EBADENGINE`; lockfile sin cambios |
| Sintaxis del workflow YAML | Parseo correcto |

Las comprobaciones locales se realizaron en Windows con Node.js 24. La ejecución real del workflow en Ubuntu/Node.js 22 sigue pendiente; las pruebas locales no se presentan como una ejecución verde de GitHub Actions.

### Pendientes y acuerdo de continuidad

1. **Auditoría completa:** los primeros intentos posteriores a la corrección fallaron por timeout o **HTTP 503 Service Unavailable**. El reintento del 2026-09-04 con npm 11.19.1 concluyó correctamente: `found 0 vulnerabilities`.
2. **Mantener el gate:** la auditoría sigue siendo obligatoria en CI, con umbral alto, y debe verificarse también en el workflow antes del merge de Release 1.
3. **PR al final de Release 1:** el owner realizará el PR cuando complete el release, no al terminar M4. Hasta entonces puede continuar el desarrollo local con la verificación de GitHub pendiente.
4. **GitHub:** comprobar la primera ejecución de **CI R1**, configurar **R1 quality** como check obligatorio para `main` y verificar que un fallo impida el merge. No se afirma que la protección de rama ya esté configurada.

Por tanto, M4 queda **implementado y verificado localmente**, incluida la auditoría sin vulnerabilidades; su definición de terminado completa permanece pendiente de la verificación del gate en GitHub.

### Fuera de alcance

- Modelos User/Session y bootstrap del primer administrador (M5).
- Endpoints de autenticación y autorización (M6–M7).
- Integración HTTP del frontend: `VITE_USE_MOCK_API` permanece en modo mock.
- Despliegue, staging o producción.

---

## Milestone 5 — Modelo User + Session + bootstrap CLI

**Estado:** completado y verificado localmente

**Fecha:** 2026-09-04

### Objetivo cumplido

Modelar usuarios, roles y sesiones en PostgreSQL, añadir persistencia reutilizable para los módulos `access` y `users`, y proporcionar un comando seguro para crear el primer Administrator en una base sin usuarios. M5 no añadió rutas HTTP ni conectó el frontend.

### Qué se entregó

#### Modelo User y roles

- Enum Prisma `Role` cerrado con exactamente `ADMINISTRATOR`, `SELLER` y `MECHANIC`.
- Modelo `User` con UUID generado por PostgreSQL y los campos MVP confirmados: `name`, `username`, `phone?`, `email?`, `role`, `active`, `passwordHash`, `createdAt` y `updatedAt`.
- `active` inicia en `true`; desactivar una cuenta actualiza el estado y conserva el registro, su identidad y sus credenciales internas.
- `username` tiene índice único y una restricción PostgreSQL adicional: debe ser no vacío, estar en minúsculas y no tener espacios exteriores.
- `createdAt` y `updatedAt` usan timestamps con zona horaria y precisión de milisegundos.

#### Modelo Session

- Modelo `Session` con UUID, `tokenHash` único, `userId` y `expiresAt`.
- Clave foránea `Session.userId → User.id`, con actualización en cascada y borrado restringido.
- Índices sobre `userId` para revocar sesiones de una cuenta y sobre `expiresAt` para facilitar limpieza futura.
- La base almacena el hash del token, no el token opaco utilizable. La generación y el hashing de tokens llegan con el servicio de autenticación de M6.
- Un usuario puede tener varias sesiones; una sesión no puede pertenecer a un usuario inexistente.

#### Migración

- Migración `apps/api/prisma/migrations/20260904000000_user_session/migration.sql` con enum, tablas, restricciones, índices y FK.
- La migración se aplicó correctamente a `truck_parts_dev` durante el paso de persistencia.
- El harness de integración la reaplicó desde cero en `truck_parts_test` para demostrar reproducibilidad.

#### Validación de usuarios

- `apps/api/src/features/users/validation.ts` contiene schemas Zod reutilizables.
- El nombre es obligatorio y se guarda sin espacios exteriores.
- El username se recorta y convierte a minúsculas antes de persistirlo.
- Teléfono y email son opcionales; una entrada vacía se representa como `null` y el email se valida cuando existe.
- La entrada de creación es estricta y rechaza campos controlados por persistencia o administración como `id`, `passwordHash` y `active`.
- La contraseña requiere al menos seis caracteres Unicode, sin reglas adicionales de complejidad. Se conserva exactamente como fue escrita: no se recorta, normaliza ni cambia entre mayúsculas y minúsculas.

#### Hashing de contraseñas

- Dependencia `argon2` 0.45.1 fijada en el workspace API y lockfile.
- `apps/api/src/features/access/password.ts` centraliza creación y verificación de hashes Argon2id.
- Parámetros explícitos: 19 MiB de memoria, 2 iteraciones y paralelismo 1.
- Cada hash utiliza un salt aleatorio generado por la librería; dos hashes de la misma contraseña son diferentes y ambos se verifican correctamente.
- Errores nativos de hashing/verificación se convierten en errores internos seguros sin incluir contraseña ni hash.

#### Repositorio de usuarios

- `apps/api/src/features/users/repository.ts` implementa `UserRepository`, compartible por los futuros servicios `access` y `users`.
- Operaciones: crear con `passwordHash`, consultar por ID, consultar por username, comprobar si existe cualquier usuario y cambiar el estado activo.
- `hasAnyUsers()` cuenta también usuarios inactivos, requisito del bootstrap one-shot.
- El repositorio acepta el cliente Prisma normal o un `Prisma.TransactionClient`, permitiendo que el servicio agrupe operaciones atómicamente.
- Devuelve registros internos que incluyen `passwordHash`; queda explícito que no deben enviarse por HTTP ni registrarse en logs.
- La validación, autorización, generación del hash, mapeo de errores y revocación de sesiones permanecen en los servicios correspondientes.

#### Repositorio de sesiones

- `apps/api/src/features/access/repository.ts` implementa `SessionRepository`.
- Operaciones: crear, buscar por hash, revocar por hash y revocar todas las sesiones de un usuario.
- Las revocaciones utilizan eliminación idempotente y devuelven cuántos registros eliminaron: repetir logout o revocación sobre una sesión inexistente no falla.
- Revocar todas las sesiones de una cuenta no afecta sesiones de otras cuentas ni elimina al usuario.
- Admite el mismo patrón de cliente transaccional que `UserRepository`.
- Una consulta puede devolver una sesión expirada; validar expiración y estado activo es responsabilidad del servicio de autenticación de M6.

#### Bootstrap del primer Administrator

- Comando raíz y de workspace: `npm run bootstrap:admin`.
- CLI interactivo que solicita nombre, username, teléfono/email opcionales y contraseña oculta introducida dos veces.
- No acepta argumentos ni credenciales por pipes; evita dejar secretos en historial de comandos, argumentos visibles o logs.
- La contraseña no se muestra en terminal y la confirmación debe coincidir exactamente.
- El servicio valida los datos, genera Argon2id y crea siempre una cuenta activa con rol `ADMINISTRATOR`; no permite seleccionar otro rol.
- No contiene credenciales predefinidas y no crea una sesión.
- Si existe cualquier usuario, activo o inactivo, rechaza la operación sin modificar la base.
- La comprobación de base vacía y la creación se ejecutan dentro de una transacción serializable. Dos ejecuciones simultáneas con usernames diferentes producen exactamente un administrador; la otra recibe un conflicto seguro.
- El hash se calcula antes de abrir la transacción para mantener corta la sección que bloquea la base.
- Ctrl+C cancela con código 130; validación, conflicto y fallos de base terminan con código 1; éxito termina con 0.
- La conexión Prisma se cierra al terminar, incluso cuando la operación falla o se cancela.
- Los mensajes inesperados omiten detalles internos, hashes, contraseñas y URLs de conexión.

#### Documentación operativa

- `README.md` explica prerrequisitos, comando, base elegida mediante `DATABASE_URL`, normalización, códigos de salida y comportamiento one-shot/concurrente.
- Crear el administrador en `truck_parts_dev` es opcional hasta que se necesite probar M6. Las pruebas crean usuarios únicamente en la base desechable indicada por `DATABASE_URL_TEST`.
- Evidencia detallada del cierre en [`../plans_api/milestone-5-verification.md`](../plans_api/milestone-5-verification.md).

### Decisiones técnicas

| Decisión                                                      | Motivo                                                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Username canónico en minúsculas y sin espacios exteriores     | Evitar identidades visualmente equivalentes y mantener la misma regla en creación y login futuro  |
| UUID generado en PostgreSQL                                   | Identificadores estables sin coordinación con la aplicación                                       |
| Argon2id con parámetros explícitos                            | Algoritmo adecuado para contraseñas y configuración reproducible entre entornos                   |
| Contraseña mínima de 6 caracteres Unicode, sin transformación | Aplicar exactamente la política MVP confirmada sin cambiar el secreto del usuario                 |
| Guardar `tokenHash`, no el token opaco                        | Una lectura de la tabla Session no entrega directamente credenciales reutilizables                |
| Repositorios compatibles con `TransactionClient`              | Permitir reglas atómicas sin duplicar persistencia ni acoplar repositorios a un servicio concreto |
| Revocaciones de sesión idempotentes                           | Logout y desactivación pueden repetirse sin convertir una ausencia esperable en error             |
| Transacción serializable en bootstrap                         | Proteger la condición global “no existe ningún usuario” ante ejecuciones simultáneas              |
| CLI interactivo sin argumentos ni pipes                       | Reducir exposición de credenciales y evitar credenciales hardcodeadas                             |

### Validación realizada

| Verificación                          | Resultado                                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Schema Prisma y migración limpia      | Válidos; migración reproducible en PostgreSQL desde cero                                        |
| Restricciones User/Session            | Username/role/token únicos y FK verificados mediante integración                                |
| Usuarios inactivos                    | Registro e identidad conservados; username permanece reservado                                  |
| Argon2id                              | Parámetros, salts independientes, contraseña correcta/incorrecta y hash inválido cubiertos      |
| Repositorio User                      | Creación, consultas, unicidad, estado, commit y rollback cubiertos                              |
| Repositorio Session                   | Creación, consulta, revocación individual/total, aislamiento, FK, commit y rollback cubiertos   |
| Bootstrap vacío/ocupado               | Crea en base vacía; rechaza cualquier usuario activo o inactivo                                 |
| Bootstrap concurrente                 | Dos ejecuciones simultáneas crean una sola cuenta                                               |
| Terminal CLI                          | Contraseña sin eco, whitespace preservado, Ctrl+C y rechazo de entrada no interactiva cubiertos |
| Unitarias API                         | 85 aprobadas                                                                                    |
| Integraciones API con PostgreSQL real | 52 aprobadas                                                                                    |
| Suite web sin regresiones             | 443 aprobadas                                                                                   |
| Total del monorepo                    | **580 pruebas aprobadas**                                                                       |
| Typecheck de aplicaciones y tests     | OK                                                                                              |
| Lint                                  | Sin errores; 4 advertencias preexistentes de React Fast Refresh                                 |
| Build API + web                       | OK; advertencia preexistente por tamaño del bundle web                                          |

Las integraciones utilizaron únicamente `DATABASE_URL_TEST`, reiniciaron esa base desechable y reaplicaron todas las migraciones. La verificación final no creó el administrador de desarrollo. El CLI compilado también rechazó correctamente una ejecución sin terminal interactiva.


### Fuera de alcance (intencional)

- Login/logout, emisión y hashing de tokens, cookies, expiración, rate limiting y perfil propio (M6).
- Autorización server-side por roles (M7).
- Gestión HTTP de usuarios y coordinación entre desactivación y revocación (M8).
- Eventos de historial de usuarios (M9).
- Integración web: `VITE_USE_MOCK_API` continúa usando mocks hasta M10–M11.
- Staging, producción y despliegue.

---

## Milestone 6 — Autenticación: login, logout, sesiones (AUTH-001)

**Estado:** código y pruebas unitarias completados (2026-09-04); las integraciones PostgreSQL/HTTP están escritas pero no se ejecutaron en esta sesión porque Prisma bloqueó `npx prisma migrate reset --force --skip-generate` sobre `truck_parts_test`.

### Objetivo cumplido

Exponer autenticación HTTP same-origin: login por `username` + password, sesiones revocables en PostgreSQL, cookie HttpOnly, perfil propio y `requireAuth` que vuelve a comprobar que la cuenta sigue activa. El frontend permanece en mock (`VITE_USE_MOCK_API` no se cambió).

### Endpoints (`/api/auth`)

| Método | Ruta | Auth | CSRF | Cuerpo / resultado |
|---|---|---|---|---|
| `POST` | `/login` | público + rate limit | no | `{ username, password }` → `PublicAuthUser` + `Set-Cookie` |
| `POST` | `/logout` | cookie opcional (idempotente) | sí | `204`; borra cookie y revoca hash si existía |
| `GET` | `/session` | `requireAuth` | no | `PublicAuthUser` |
| `GET` | `/me` | `requireAuth` | no | `PublicProfile` |
| `PATCH` | `/me` | `requireAuth` | sí | `name`, `phone?`, `email?`, cambio de password; responde `PublicProfile` |

Ninguna respuesta JSON incluye `passwordHash` ni el token opaco de sesión.

### Cookie, CSRF y rate limit

| Decisión | Elección | Motivo |
|---|---|---|
| Cookie | `sid`, `HttpOnly`, `Path=/`, `SameSite=Lax`, `Secure` solo si `NODE_ENV=production` | Same-origin; HTTPS de despliegue aún no existe |
| Token | 32 bytes aleatorios en hex; en BD solo SHA-256 hex del valor de la cookie | Una lectura de `Session` no entrega un identificador reutilizable |
| TTL | 12 h absoluto, sin sliding | Confirmado en constantes de M6 paso 1 |
| Rotación | Login crea sesión nueva y revoca el hash del `sid` previo si venía en la request | Evita reutilizar el identificador anterior |
| CSRF | Header `X-Requested-With: XMLHttpRequest` en `PATCH` y `POST /logout` | Defensa adicional a SameSite=Lax; GET no lo exige; login es público |
| Fallo CSRF | `403 FORBIDDEN` (`CSRF validation failed`) | Distinto de 401 de sesión ausente/expirada |
| Rate limit | `express-rate-limit` 8.x solo en `POST /login`, 10 intentos / 15 min, clave IP | Fuerza bruta; exceso → `429 TOO_MANY_REQUESTS` con el envelope M3 |
| Login fallido | Siempre `401` + `Invalid credentials` (usuario inexistente, password incorrecta o cuenta inactiva) | No filtrar cuál condición falló; verify dummy si no hay usuario |

`PATCH /me` no acepta `username`, `role` ni `active` (schema Zod estricto). El repositorio de perfil propio tampoco persiste esos campos. Cambiar password exige password actual; actual incorrecta o nueva corta → `400 VALIDATION`.

### Capas

- Tokens: `features/access/session-token.ts`
- Servicio: `AccessService` (sin Express) usa `UserRepository` + `SessionRepository`
- HTTP: `routes` → `controller` → servicio; `requireAuth` / CSRF / rate limit en el feature `access`
- `createApp()` monta `accessRouter` en `/api/auth` después de `express.json` y antes del 404

### Tests

- Unitarias: hashing de token, reglas de `AccessService` con dobles de repositorio, cookie/`requireAuth`/CSRF, schemas HTTP, proyección y `429` del mapper
- Integración (archivos listos): `tests/integration/access/auth-http.test.ts` (cookie, login inválido/inactivo, logout, session/me, PATCH, CSRF 403, rate limit 429) y extensión de `UserRepository.updateOwnProfile`
- Fixtures con `UserRepository` + `hashPassword`; no se usan credenciales mock `admin`/`demo1234`

### Validación realizada

| Verificación | Resultado |
|---|---|
| `npm run test:unit --workspace @truck-parts/api` | **113** aprobadas |
| `npm run typecheck --workspace @truck-parts/api` | OK |
| `npm run test:integration --workspace @truck-parts/api` | No ejecutado: Prisma AI safety bloqueó `migrate reset` sobre `truck_parts_test` (localhost:5433). No se usó `PRISMA_USER_CONSENT`. No se tocó `truck_parts_dev` ni producción. |

### Fuera de alcance (intencional)

- `requireRole` / proyección por rol (M7)
- HTTP de administración de usuarios (M8)
- Swap web: `auth-api.ts` stub y `VITE_USE_MOCK_API=false` (M10)
- Invalidación masiva al desactivar (comando admin M8); `requireAuth` sí revoca la sesión si la cuenta ya está inactiva

---

## Milestone 7 — Autorización server-side

**Estado:** código y pruebas unitarias completados (2026-09-04). Las integraciones PostgreSQL/HTTP están escritas; `prisma migrate reset` sobre `truck_parts_test` (localhost:5433) lo bloqueó Prisma AI safety en esta sesión.

### Objetivo cumplido

Separar autorización de autenticación (AUTH-002 / AUTH-005): el servidor vuelve a evaluar el rol
en cada operación protegida. Mechanic no recibe datos comerciales en `/session`. El frontend
permanece en mock.

### Policies

| Helper | Comportamiento |
|---|---|
| `requireRole(...roles)` | Sin `req.auth` → `401 UNAUTHORIZED`. Rol no listado → `403 FORBIDDEN` (`Insufficient permissions`, distinto del CSRF). Rol permitido → `next()`. |
| `requireAdministrator` | `requireRole('ADMINISTRATOR')` |

Deben ir **después** de `requireAuth`. M8 repetirá la regla de Administrator en el service de `users`.

### Proyección `GET /api/auth/session`

| Rol | Cuerpo |
|---|---|
| Mechanic | `{ id, username, name, role }` |
| Seller / Administrator | identidad + `phone` + `email` (contacto propio, no comercial) |

`GET /api/auth/me` sigue siendo perfil propio para **todos** los roles (Feature 01 self-service).
La proyección de Work Orders sin campos comerciales (WO-003) no forma parte de Release 1.

### Placeholder

`GET /api/auth/admin-probe` — `requireAuth` + `requireAdministrator` → `{ ok: true }`.
No gestiona usuarios; existe para tests negativos y smoke hasta que M8 monte `/api/admin/users`.

### Tests

- Unitarias: `require-role.test.ts`, proyección Mechanic vs Seller/Admin
- Integración: 401 sin cookie; Seller/Mechanic 403 sin mutar estado; Administrator 200; Mechanic `/session` sin phone/email y `/me` con contacto propio

### Validación realizada

| Verificación | Resultado |
|---|---|
| `npx vitest run tests/unit` (API) | **120** aprobadas |
| `npm run typecheck --workspace @truck-parts/api` | OK |
| Integración HTTP autorización | Escrita; no ejecutada en esta sesión (mismo bloqueo de `migrate reset` sobre `truck_parts_test`) |

### Fuera de alcance (intencional)

- HTTP de administración de usuarios (M8)
- Swap web (M10)
- Matriz completa de inventario/ventas/OT (`ROLES_AND_PERMISSIONS.md`); este milestone solo deja el mecanismo de rol

---

---

## Milestone 8 — Gestión de usuarios Administrator y recuperación (backend)

**Estado:** completado y verificado localmente.

**Fecha:** 2026-09-05.

### Objetivo cumplido

Implementar administración HTTP de cuentas con primer acceso restringido, cambio de contraseña propio y recuperación aprobada por otro Administrator. Únicamente backend M8; frontend permanece mock y history envelope queda pendiente M9.

### Qué se entregó

- Stack `users` routes/controller/service/repository/validation/types; policies de servicio, repositorio de recuperación y helper transaccional compartido con `access`.
- `POST/GET/PATCH /api/admin/users`: creación, listado paginado y edición de perfil/username/rol/estado, exclusivos de Administrator activo sin cambio pendiente. Schemas estrictos rechazan credenciales y flag en administración normal.
- Creación administrativa sin contraseña en input: Argon2id de `solocamiones`, cuenta activa y `mustChangePassword=true`. Bootstrap conserva contraseña interactiva; cuentas existentes mantienen hash y flag false.
- Migración `20260905000000_user_management`: flag y tabla `PasswordRecoveryRequest`, estados, FK restrictivas, índice único parcial por usuario pendiente y checks de resolución por otro administrador/verificación.
- Login/session/me exponen flag para todos los roles. `requireAuth` bloquea operaciones normales con 403 y `details.reason=PASSWORD_CHANGE_REQUIRED`; perfil/sesión usan guard restringido explícito y logout permanece disponible.
- Todo cambio desde perfil verifica contraseña actual y nueva distinta, mínimo seis caracteres Unicode. Hash/flag/revocación de todas las sesiones/cancelación de solicitudes pendientes se confirman juntos; respuesta limpia cookie y requiere login nuevo. Contacto solo no elimina restricción.
- Recuperación pública `POST /api/auth/recovery-requests`: username, respuesta 202 genérica, una pendiente vigente por usuario activo, vencimiento 24 horas y límite 10 solicitudes/IP/15 minutos. No cambia credenciales ni sesiones al solicitar.
- `GET /api/admin/users/recovery-requests` y `POST /api/admin/users/recovery-requests/:id/resolve`: otro administrador lista y resuelve; aprobar exige `identityVerified=true` después de verificación personal/telefónica. Rechazar no modifica acceso.
- Aprobación genera contraseña temporal criptográfica (24 bytes/32 caracteres base64url), sin vencimiento, devuelta una sola vez para entrega personal; guarda solo hash, exige cambio, revoca sesiones y consume solicitud atómicamente. No se devuelve en listas ni se almacena en solicitudes/logs. Respuestas sensibles usan `Cache-Control: no-store`.
- Desactivación conserva registro/hash y revoca sesiones/cancela solicitudes. Reactivar no recupera sesiones ni cambia flag. No se permite auto-desactivación, auto-degradación ni auto-resolución. Transacciones serializables protegen un mínimo de un Administrator activo y carreras de cambios/recuperación/login.
- Sin correo, CLI de recuperación ni segundo administrador obligatorio. Un único administrador sin credenciales no puede recuperarse mediante la aplicación.

### Verificación realizada

| Verificación | Resultado |
|---|---|
| Unitarias API | **130 aprobadas** |
| Integraciones API PostgreSQL/HTTP | **87 aprobadas**, incluidas M6–M7 y 17 casos M8 |
| Suite web sin cambios | **443 aprobadas** |
| Total | **660 pruebas aprobadas** |
| Typecheck API, tests API y web | OK |
| Build API + web | OK; advertencia preexistente de tamaño del bundle web |
| Lint | Sin errores; cuatro advertencias preexistentes de React Fast Refresh |
| Migraciones limpias | Harness estándar reaplica las tres migraciones en `DATABASE_URL_TEST` |
| Migración local de desarrollo | Aplicada a `truck_parts_dev` en localhost:5433 con `npm run db:migrate:deploy`, sin reset ni modificación de contraseñas |
| Diff whitespace | `git diff --check` sin errores |

Pruebas M8: tres roles, validación/inyección, secretos excluidos, CSRF, paginación, duplicados, desactivación/reactivación, solicitudes genéricas/duplicadas/vencidas, contraseña temporal sin vencimiento, aprobación entre administradores, prohibición de auto-resolución, concurrencia y rollback ante fallos simulados. El cambio desde perfil se prueba tanto obligatorio como voluntario. Se comprueba relectura de credenciales antes de emitir sesión.

Las integraciones M6–M7 previamente documentadas como no ejecutadas sí pasaron durante este cierre. Se conserva su nota histórica de aquella sesión. No se ejecutó CI en GitHub ni se configura su protección de rama desde M8; M4 mantiene esos pendientes. No se cambiaron dependencias ni se afirma una nueva auditoría npm.

### Documentación y operación

Contrato de endpoints, ejemplos JSON, estructura, reglas y explicación paso a paso en [`../plans_api/milestone-8-verification.md`](../plans_api/milestone-8-verification.md). Plan principal y Feature 01 alineados con las decisiones finales. Se conserva el endpoint M7 `admin-probe` como smoke compatible, además de las rutas reales de usuarios.

### Fuera de alcance

- History append-only y eventos de usuarios/recuperación (M9); las solicitudes no reemplazan ese envelope.
- Pantallas y swap HTTP de login/perfil/solicitud (M10), administración/resolución (M11).
- Correo, recuperación local de emergencia, staging o producción.

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
