# Milestone 5 — Verificación local

Fecha: 2026-09-04. Estado: definición de terminado de M5 verificada en local.

## Entregables y evidencia

| Criterio | Implementación / evidencia |
|---|---|
| User y Session con FK e índices | `apps/api/prisma/schema.prisma` y migración `20260904000000_user_session` |
| Username único, normalizado; enum cerrado | Restricciones PostgreSQL y `tests/integration/access/schema.test.ts` |
| Contraseñas de mínimo 6 caracteres y Argon2id | `features/access/validation.ts`, `password.ts` y pruebas unitarias con hashing real |
| Repositorio User compartido, sin borrado al desactivar | `features/users/repository.ts`; pruebas de identidad, unicidad y rollback |
| Persistencia y revocación de sesiones | `features/access/repository.ts`; pruebas por token, por usuario y transacciones |
| Bootstrap solo en base sin usuarios | `features/users/bootstrap.ts`; rechazo con usuarios activos o inactivos |
| Bootstrap concurrente | Dos invocaciones simultáneas con distintos usernames: exactamente una cuenta creada |
| CLI con contraseña oculta | Pruebas de terminal simulada: entrada preservada, sin eco, Ctrl+C y rechazo de pipes |
| CLI documentado | README: comando, base objetivo, campos, errores y códigos de salida |

Los paths de implementación son relativos a `apps/api/src/`; los de pruebas, a
`apps/api/`, salvo cuando se indica el path completo desde la raíz del repositorio.

## Verificaciones ejecutadas

- `npm test`: 580 pruebas aprobadas (85 unitarias API, 52 integración API, 443 web).
  La suite web incluye sus pruebas unitarias, de integración y de componentes.
- `npm run typecheck`: correcto en API y web, incluyendo tests API.
- `npm run typecheck:test -w @truck-parts/web`: correcto.
- `npm run lint`: cero errores; cuatro advertencias preexistentes de Fast Refresh web.
- `npm run build`: API y web correctos; advertencia de bundle web mayor de 500 kB.
- El harness de integración reinició `DATABASE_URL_TEST` y reaplicó las migraciones
  desde cero; health live/ready y las restricciones de dominio pasaron.
- `npm audit --audit-level=high --fetch-retries=0 --fetch-timeout=20000`: sin resultado
  por timeout del endpoint de auditoría npm. No equivale a cero vulnerabilidades.

## Límites del cierre

La definición de terminado local de M5 está cubierta. El gate de auditoría sigue
pendiente, al igual que la primera ejecución remota y el check obligatorio de M4;
no se deshabilitó ningún gate. No se hizo commit, PR ni despliegue en este paso.

No se creó el administrador de desarrollo durante estas verificaciones. Los usuarios
del bootstrap automatizado pertenecen únicamente a la base desechable de pruebas.
No hubo nuevas migraciones ni cambios en la base de desarrollo en este paso.

Las pruebas del terminal utilizan streams que simulan TTY; no se declara una sesión
manual completa con credenciales de desarrollo. El CLI compilado ya fue comprobado
en el paso 6 para rechazar ejecución sin terminal interactiva.

M6 debe implementar login/logout, generación y hashing de tokens, cookies, comprobación
de expiración/usuario activo, protección de mutaciones y perfil propio. M7 añade
autorización por roles. M8 coordina desactivación y revocación; M9 añade historial.
La web permanece en mock hasta la integración prevista. No se marca completa la
Feature 01 ni Release 1 por terminar M5.
