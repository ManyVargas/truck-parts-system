# Milestone 9 — History de usuarios: implementación y verificación

**Fecha:** 2026-09-05. **Estado:** completado en local.

## Alcance aprobado

HIST-001/002 slice R1 y AUTH-004: envelope reutilizable y evidencia del ciclo de cuentas. El owner aprobó incluir cambios de perfil con valores anteriores/nuevos, cambio propio de contraseña, bootstrap y recuperación de M8 (incluidos vencimientos y cancelaciones). La recuperación operativa de ADMIN-002 continúa en Release 8.

## Envelope y catálogo

`HistoryEvent` conserva `id` UUID, `occurredAt` TIMESTAMPTZ(3) generado en PostgreSQL, `actorType`, `actorUserId`, `eventType`, `subjectType`, `subjectId` y `payload` JSONB. Todos los sujetos R1 son USER; la solicitud relacionada se referencia con `payload.requestId`. La estructura permite otras categorías cuando se implementen sus features.

| Evento | Actor | Payload |
|---|---|---|
| USER_CREATED | Administrator autenticado o SYSTEM para bootstrap | Perfil, rol, active, mustChangePassword y source ADMINISTRATION/BOOTSTRAP_CLI |
| USER_ROLE_CHANGED | Administrator | before/after del rol |
| USER_ACTIVATED / USER_DEACTIVATED | Administrator | before/after del estado |
| USER_PROFILE_CHANGED | Administrator o usuario en perfil propio | before/after de name, username, phone, email; null conserva la eliminación del contacto |
| USER_PASSWORD_CHANGED | Usuario en perfil propio | wasChangeRequired y mustChangePassword=false; nunca valores de contraseña |
| USER_RECOVERY_REQUESTED | ANONYMOUS | requestId, expiresAt, after=PENDING |
| USER_RECOVERY_APPROVED | Otro Administrator | requestId, PENDING→APPROVED, identityVerified=true, mustChangePassword=true |
| USER_RECOVERY_REJECTED | Otro Administrator | requestId, PENDING→REJECTED |
| USER_RECOVERY_EXPIRED | SYSTEM | requestId, PENDING→EXPIRED |
| USER_RECOVERY_CANCELLED | Usuario o Administrator causante | requestId, PENDING→CANCELLED, reason PASSWORD_CHANGED/USER_DEACTIVATED |

La aprobación registra su propio evento; no se presenta como cambio de contraseña realizado por el dueño. La creación tampoco emite activación separada. Cambiar perfil, rol y estado en una misma operación produce un evento por transición pertinente. Repetir valores actuales no produce eventos de cambio.

Los perfiles guardan snapshots explícitos de esos cuatro campos, no registros User completos. Zod rechaza propiedades inesperadas incluso anidadas. No se aceptan contraseñas, passwordHash, credenciales temporales ni tokens de sesión en el contrato de eventos. No se serializan cuerpos HTTP ni respuestas completas.

## Atribución e inmutabilidad

- USER requiere actorUserId con FK restrictiva; ANONYMOUS/SYSTEM requieren null. PostgreSQL comprueba esta correspondencia y la FK.
- La solicitud pública no demuestra la identidad del dueño de la cuenta; ese dueño es el sujeto del evento. Solicitudes para cuentas inexistentes/inactivas no generan un acontecimiento de éxito; la respuesta HTTP genérica de M8 se conserva.
- Bootstrap registra SYSTEM con origen CLI. No se inventa una identidad humana autenticada ni se añaden eventos retrospectivos a cuentas existentes.
- Los usuarios desactivados conservan su registro y pueden resolverse por FK, sin filtrar por active. El historial no se reescribe al cambiar o desactivar al actor.
- El repositorio solo expone append y exige un cliente de persistencia suministrado por la transacción. No existen rutas HTTP de escritura, edición, borrado ni lectura de history en R1; las pruebas consultan PostgreSQL internamente.
- Un trigger rechaza UPDATE/DELETE. No constituye una defensa contra el dueño de la base, DDL o TRUNCATE privilegiado. El entorno local usa la configuración existente; restringir privilegios de despliegue sigue perteneciendo a la preparación productiva.
- occurredAt representa la transacción que persiste la transición, no una hora de commit ni un orden total entre eventos simultáneos. Los índices soportan lectura estable por fecha/id.

## Coordinación transaccional

`AccountRepositories` incorpora `HistoryRepository(tx)`. UserService decide los eventos en create/update/requestRecovery/listRecoveries/resolveRecovery; AccessService en updateOwnProfile. Bootstrap usa su propia transacción serializable con el mismo repositorio.

Los helpers de perfil comparan snapshots permitidos. RecoveryRepository devuelve exactamente las filas vencidas/canceladas con updateManyAndReturn; se emite un evento por fila modificada. Si ya no están pendientes, no se duplican.

Se conserva el comportamiento de M8: las solicitudes vencen de forma diferida al pedir otra solicitud o al listar pendientes. La fecha de caducidad ya impide aprobarlas aunque aún no se haya materializado EXPIRED. El evento se escribe cuando esa transición se persiste; listar puede producir eventos SYSTEM por ese motivo. No se añade un scheduler.

Todas las inserciones comparten transacción con la cuenta, solicitud y revocación de sesiones. Un fallo, incluido después de insertar el evento, revierte todo. Los reintentos serializables repiten la evaluación completa; las transacciones abortadas no dejan eventos. Esto no añade claves de idempotencia HTTP generales.

## Pruebas y resultados

- 139 unitarias API: incluyen validación estricta de actores, sujetos, categorías y secretos anidados.
- 97 integraciones API: 10 nuevas de M9 más M6–M8 y persistencia/health existentes. Cubren todos los eventos, no-op, rol/perfil simultáneos, actores inactivos, UPDATE/DELETE rechazados, FK, comandos fallidos, rollback de creación/desactivación/aprobación/contraseña, concurrencia de solicitud/aprobación/contraseña/bootstrap y ausencia de secretos.
- Aserciones de history añadidas a flujos HTTP M8 de creación por los tres roles objetivo, desactivación, autorización negativa y sustitución de una solicitud vencida.
- 443 pruebas web aprobadas en repetición completa. La primera ejecución falló una aserción de eliminación inmediata de un elemento en PosPage; el archivo pasó aislado (12) y la suite completa pasó al repetirla. Sin cambios web.
- Total final: 679 pruebas. Typecheck API/tests/web, lint y build API/web correctos. Permanecen cuatro warnings de Fast Refresh y aviso de bundle web preexistentes.

## Migración y operación local

Migración: `apps/api/prisma/migrations/20260905010000_history/migration.sql`. Añade enum, tabla, índices, checks, FK y trigger. No modifica usuarios, contraseñas ni solicitudes existentes, y no hace backfill.

Aplicada durante este cierre a `truck_parts_dev`, schema public, localhost:5433, mediante `npm run db:migrate:deploy`. Prisma confirmó la aplicación de la única migración pendiente, sin reset.

El harness de integración reinicia únicamente la base desechable de `DATABASE_URL_TEST` y reaplica las cuatro migraciones. La limpieza entre casos de las suites que generan historial usa un helper exclusivo de tests con comprobación de NODE_ENV, URL y current_database antes de TRUNCATE; no se desactiva el trigger del producto.

Comandos de reproducción desde la raíz:

```sh
npm run db:migrate:deploy
npm run test:unit --workspace @truck-parts/api
npm run test:integration --workspace @truck-parts/api
npm run typecheck
npm run lint
npm run build
npm run test:web
```

M10 integra auth HTTP; M11 integra usuarios HTTP y verifica el exit gate. M4 conserva la verificación del PR y check obligatorio en GitHub. No se modifican frontend, dependencias ni configuración de despliegue.
