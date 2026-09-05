# Milestone 8 — Gestión de usuarios y recuperación autorizada

Fecha: 2026-09-05. Implementación local exclusivamente backend. M9 (history envelope), M10 y M11 (integración web) permanecen pendientes.

## Decisiones finales del owner

- Las cuentas creadas mediante administración reciben `solocamiones`, con cambio obligatorio desde perfil. Administrator no introduce contraseñas al crear ni editar usuarios.
- Las cuentas existentes y el primer Administrator de bootstrap conservan contraseña y no tienen cambio obligatorio. No se identifica ni transforma ninguna cuenta antigua.
- Todo cambio desde perfil exige contraseña actual y nueva distinta, de al menos seis caracteres Unicode; revoca todas las sesiones, incluida la actual, y exige nuevo login.
- La excepción administrativa es recuperación solicitada por el usuario: otro Administrator confirma verificación personal o telefónica y el sistema genera una contraseña temporal que entrega personalmente. Administrator no elige esa contraseña.
- Las solicitudes pendientes vencen a las 24 horas. La contraseña temporal **no vence**; solo permite el flujo restringido hasta que el usuario la reemplace.
- Nadie puede desactivarse, quitarse su propio rol Administrator ni resolver su propia solicitud. Se conserva al menos un Administrator activo.
- No hay correo, comando local de recuperación ni obligación de crear un segundo Administrator. Si el único administrador pierde acceso, la aplicación no ofrece recuperación para él.

## Persistencia y estructura

Migración: `apps/api/prisma/migrations/20260905000000_user_management/migration.sql`.

- `User.mustChangePassword`: booleano con default `false`; la creación administrativa escribe explícitamente `true`. Migración aditiva, sin cambiar hashes existentes.
- `PasswordRecoveryRequest`: UUID, usuario sujeto, estado, creación, vencimiento, resolución, administrador responsable y confirmación de identidad. FK restrictivas preservan identidades.
- Estados: `PENDING`, `APPROVED`, `REJECTED`, `EXPIRED`, `CANCELLED`. Índice único parcial impide dos filas `PENDING` por usuario. Restricciones SQL impiden resolver una solicitud propia y aprobar sin verificación/actor.
- El vencimiento se comprueba al resolver y se materializa al listar o solicitar nuevamente; no hay tarea programada. Una fila todavía marcada `PENDING` pero con fecha vencida no se puede aprobar.
- Desactivar o cambiar la contraseña desde perfil cancela solicitudes pendientes: evita que una solicitud antigua siga habilitando una recuperación después de esos cambios.

`users` mantiene routes → controller → service → repository, con schemas Zod estrictos y tipos. `recovery-repository.ts` encapsula persistencia de solicitudes; `transaction.ts` agrupa repositorios User/Session/Recovery. `access` conserva autenticación, guard y cambio desde perfil.

Las transacciones serializables repiten las lecturas y reglas completas ante conflictos `P2034` (hasta tres reintentos). Conflictos finales o unicidad → 409; recurso inexistente → 404. Hashes se calculan antes de abrir la transacción para mantenerla corta. Las respuestas públicas seleccionan campos y nunca serializan el registro interno de credenciales.

## Contrato HTTP

Las escrituras autenticadas requieren cookie `sid` y `X-Requested-With: XMLHttpRequest`. Los cuerpos son JSON. Respuestas de auth/administración incluyen `Cache-Control: no-store`.

| Método y ruta | Acceso | Resultado |
|---|---|---|
| `POST /api/admin/users` | Administrator sin cambio pendiente + CSRF | 201, perfil público del usuario creado |
| `GET /api/admin/users?page=1&pageSize=20` | Administrator sin cambio pendiente | 200, `{ items, total, page, pageSize }`, incluye inactivos |
| `PATCH /api/admin/users/:id` | Administrator sin cambio pendiente + CSRF | 200, perfil público actualizado |
| `POST /api/auth/recovery-requests` | Público, limitado por IP | 202, mensaje genérico sin confirmar si existe username |
| `GET /api/admin/users/recovery-requests?page=1&pageSize=20` | Administrator sin cambio pendiente | 200, solicitudes pendientes vigentes con identidad del sujeto |
| `POST /api/admin/users/recovery-requests/:id/resolve` | Otro Administrator sin cambio pendiente + CSRF | 200, solicitud resuelta y contraseña temporal solamente si aprueba |
| `PATCH /api/auth/me` | Cuenta activa, permite cambio pendiente + CSRF | 200, perfil; si cambia contraseña también limpia cookie y revoca sesiones |

Paginación: página desde 1 (máximo 1.000.000), tamaño por defecto 20 y máximo 100. Orden estable por `createdAt` e `id`. Recuperaciones se listan desde la más antigua.

Crear usuario:

```json
{ "name": "Juan Pérez", "username": "juan", "role": "MECHANIC", "phone": "8095550000" }
```

PATCH administrativo permite `name`, `username`, `phone`, `email`, `role`, `active`; campos omitidos se conservan, contacto vacío/null se limpia. Username se normaliza a minúsculas sin espacios exteriores y sigue siendo único, incluso si la cuenta está inactiva. Un PATCH vacío es 400. Credenciales y `mustChangePassword` están prohibidos en POST/PATCH administrativos, incluso sobre la propia cuenta.

Solicitar recuperación:

```json
{ "username": "juan" }
```

La respuesta siempre es `{ "message": "If the account is eligible, its recovery request will be available to an administrator." }` para input válido, sea cuenta inexistente, inactiva, solicitud repetida o nueva. Una solicitud no cierra sesiones ni modifica contraseña. Límite: 10 solicitudes por IP en 15 minutos, almacén en memoria del proceso (mismo alcance local que login); exceso → 429.

Aprobar:

```json
{ "action": "approve", "identityVerified": true }
```

Rechazar:

```json
{ "action": "reject" }
```

Una aprobación retorna `{ "request": { ... }, "temporaryPassword": "..." }`. Contraseña generada con 24 bytes aleatorios criptográficos codificados como base64url (32 caracteres, 192 bits), almacenada únicamente como Argon2id en User. No se guarda en la solicitud, logs ni listas. Se devuelve una sola vez; repetir resolución da 409. Si se pierde esa respuesta, no existe lectura posterior del secreto: debe solicitarse una nueva recuperación.

La confirmación `identityVerified` registra lo declarado por Administrator; el software no demuestra que haya hablado con la persona. Una solicitud inactiva/vencida/resuelta no habilita aprobación. Las cuentas desactivadas no se reactivan por recuperar contraseña.

Cambiar desde perfil (el contrato previo conserva `name` requerido):

```json
{ "name": "Juan Pérez", "currentPassword": "solocamiones", "password": "mi-clave-personal" }
```

No hay endpoint de reset libre, DELETE de usuario, recuperación por correo ni CLI de recuperación. El bootstrap original sigue siendo one-shot y no sirve para recuperar cuentas.

## Ejecución de los flujos

### Alta y primer acceso

1. Administrator autenticado crea la cuenta sin contraseña en el input.
2. El servicio comprueba el actor en BD y persiste hash inicial + `mustChangePassword=true`.
3. El usuario inicia sesión con `solocamiones`; login/session/me exponen el flag para los tres roles.
4. `requireAuth` bloquea operaciones normales con 403, código `FORBIDDEN`, `details.reason=PASSWORD_CHANGE_REQUIRED`. `requireProfileAuth` permite `/session` y `/me`; logout sigue disponible.
5. Editar contacto no libera la restricción. Cambiar contraseña exige la actual y una nueva diferente.
6. Una transacción compara otra vez las credenciales leídas, actualiza perfil/hash/flag, revoca sesiones y cancela solicitudes pendientes. Si falla algo, todo se revierte.
7. La respuesta borra cookie; el usuario vuelve a login con su contraseña nueva. Ninguna sesión emitida con la contraseña anterior recupera acceso.

### Recuperación

1. El usuario solicita por username. La API crea como máximo una solicitud pendiente por cuenta activa.
2. Otro Administrator lista solicitudes, verifica identidad por conversación y aprueba o rechaza.
3. Rechazo cierra solicitud sin tocar credenciales ni sesiones. Aprobación escribe hash temporal, marca cambio obligatorio, revoca sesiones y resuelve solicitud dentro de una transacción.
4. El administrador recibe la contraseña temporal y la entrega personalmente. No puede elegirla ni recuperarla posteriormente desde la API.
5. El usuario inicia sesión con ella, cambia desde su perfil y vuelve a iniciar sesión con su contraseña personal. La temporal no expira por tiempo, pero deja de ser válida al reemplazarla.

### Desactivación y roles

1. El servicio vuelve a comprobar el estado/rol del actor y carga el sujeto dentro de la transacción.
2. Rechaza auto-desactivación/auto-degradación y protege la permanencia de un Administrator activo.
3. Actualiza únicamente campos permitidos. Desactivar revoca sesiones y cancela solicitudes pendientes, conservando usuario y hash.
4. Reactivar no devuelve sesiones antiguas ni altera el flag. Un usuario pendiente sigue obligado a cambiar contraseña.

## Verificación

- Pruebas específicas: `apps/api/tests/unit/users/management.test.ts` y `apps/api/tests/integration/users/management-http.test.ts`.
- Integraciones existentes de auth/proyección adaptadas al flag; unitarias de servicio usan transacción inyectable sin BD.
- Cobertura: tres roles; 400/401/403/404/409/429; CSRF; listas; secretos excluidos; recuperación genérica; duplicación/vencimiento; auto-resolución; recuperación entre administradores; reactivación; contraseña temporal válida en fecha futura; cambio voluntario/obligatorio; revocación masiva; carreras de aprobación/cambio de contraseña/roles; rollback simulado; relectura de credenciales antes de emitir sesión.
- PostgreSQL: harness estándar usa exclusivamente `DATABASE_URL_TEST`, reinicia la base desechable y reaplica migraciones. No se requieren bypasses de Prisma; integraciones M6–M7 ejecutadas en este cierre.

Resultados finales y estado de aplicación en desarrollo: ver sección M8 de `docs/done_api/release-1.md`.

## Pendientes fuera de M8

- M9: envelope de history y eventos de ciclo de vida/recuperación, sin credenciales en payload. Las solicitudes persistidas no sustituyen el historial append-only.
- M10: UX de sesión restringida, perfil con nuevo login y solicitud de recuperación pública.
- M11: retirar contraseña del formulario administrativo, conectar listado/edición/recuperaciones y mostrar una sola vez la contraseña temporal al aprobar.
- Frontend permanece mock; no se implementan pantallas, correos ni despliegue. M4 conserva su verificación GitHub pendiente.
