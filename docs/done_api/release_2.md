# Release 2 — Registro de lo implementado

**Release:** Billing Core  
**Plan de referencia:** [`../plans_api/plan_release_2.md`](../plans_api/plan_release_2.md)  
**Estado:** en curso (M1–M3 completados)

Este archivo documenta **qué se entregó** en cada milestone de Release 2, a medida que se completan.  
No sustituye a `plan_release_2.md` (plan de ejecución) ni a los feature specs; es el registro histórico de implementación.

---

## Milestone 1 — Customers persistencia

**Estado:** completado  
**Fecha:** 2026-09-07

### Objetivo cumplido

Clientes, contactos y `Cliente contado` persisten en PostgreSQL sin rutas HTTP.

### Qué se entregó

- Modelos Prisma `Customer` y `CustomerContact`.
- Semilla de migración de `Cliente contado` (contactos vacíos, sin RNC).
- `CustomerRepository`: create, find, search (nombre/RNC), update.
- Validación Zod reutilizable (sin Express).

### Decisiones técnicas

- Teléfono/email viven en contactos; `isPrimary` con máximo uno (índice parcial).
- RNC/Cédula se guarda solo en dígitos (9 u 11) y es unique cuando existe.
- `Cliente contado` usa UUID (el `subjectId` de history es UUID); el mock web `C0` no se replica en API.
- Unique parcial de un solo `isDefault`.

### Validación

- Integration: `apps/api/tests/integration/customers/repository.test.ts`
- Unit: `apps/api/tests/unit/customers/validation.test.ts`

### Fuera de alcance (intencional)

HTTP de customers (M2). Snapshot CUST-003 (M12). Swap web (M19).

---

## Milestone 2 — Customers HTTP

**Estado:** completado  
**Fecha:** 2026-09-07

### Objetivo cumplido

Search/create/edit HTTP con autorización server-side e history en la misma transacción.

### Qué se entregó

- Módulo `customers`: routes → controller → service → repository.
- `GET/POST /api/customers`, `GET/PATCH /api/customers/:id`.
- Seller/Administrator ALLOW; Mechanic 403; CSRF en escrituras.
- History `CUSTOMER_CREATED` / `CUSTOMER_UPDATED`.
- `satisfiesFiscalIdentity` para M7/M12.
- `Cliente contado` no se edita (409).

### Decisiones técnicas

- Paginación `page` / `pageSize` como users.
- Formato fiscal: RNC 9 dígitos o cédula 11, con o sin separadores.
- El service re-chequea rol; isolation Serializable.

### Validación

- Integration: `apps/api/tests/integration/customers/http.test.ts`
- Unit history: `apps/api/tests/unit/customers/history-validation.test.ts`

### Fuera de alcance (intencional)

Facturas. Swap `HttpCustomerRepository` (M19). Comando DELETE.

---

## Milestone 3 — Catálogo de servicios persistencia

**Estado:** completado  
**Fecha:** 2026-09-07

### Objetivo cumplido

Tipos de servicio mecánico en PostgreSQL, sin precio y sin HTTP.

### Qué se entregó

- Modelo Prisma `MechanicalService` (`name`, `description` opcional, `active`).
- `CatalogRepository`: create/update, `listAll`, `listActive`.

### Decisiones técnicas

- Módulo `features/catalogs/` (solo servicios; sin categorías de inventario).
- Precio sigue fuera del catálogo (línea M9).

### Validación

- Integration: `apps/api/tests/integration/catalogs/repository.test.ts`
- Unit: `apps/api/tests/unit/catalogs/validation.test.ts`

### Fuera de alcance (intencional)

HTTP del catálogo (M4). Swap web (M20).

---

## Milestone 4 — Catálogo de servicios HTTP

**Estado:** pendiente  
**Fecha:**

### Objetivo cumplido

### Qué se entregó

### Decisiones técnicas

### Validación

### Fuera de alcance (intencional)

---

## Milestone 5 — Motor de cálculo ITBIS y redondeo

**Estado:** pendiente  
**Fecha:**

### Objetivo cumplido

### Qué se entregó

### Decisiones técnicas

### Validación

### Fuera de alcance (intencional)

---

## Milestone 6 — Esquema Invoice, líneas y secuencia `FAC-`

**Estado:** pendiente  
**Fecha:**

### Objetivo cumplido

### Qué se entregó

### Decisiones técnicas

### Validación

### Fuera de alcance (intencional)

---

## Milestone 7 — Draft HTTP cáscara

**Estado:** pendiente  
**Fecha:**

### Objetivo cumplido

### Qué se entregó

### Decisiones técnicas

### Validación

### Fuera de alcance (intencional)

---

## Milestone 8 — Draft línea GENERIC + rechazo ITEM/QTY

**Estado:** pendiente  
**Fecha:**

### Objetivo cumplido

### Qué se entregó

### Decisiones técnicas

### Validación

### Fuera de alcance (intencional)

---

## Milestone 9 — Draft línea SERVICE

**Estado:** pendiente  
**Fecha:**

### Objetivo cumplido

### Qué se entregó

### Decisiones técnicas

### Validación

### Fuera de alcance (intencional)

---

## Milestone 10 — Draft línea DELIVERY

**Estado:** pendiente  
**Fecha:**

### Objetivo cumplido

### Qué se entregó

### Decisiones técnicas

### Validación

### Fuera de alcance (intencional)

---

## Milestone 11 — Draft línea EXTERNAL + costo

**Estado:** pendiente  
**Fecha:**

### Objetivo cumplido

### Qué se entregó

### Decisiones técnicas

### Validación

### Fuera de alcance (intencional)

---

## Milestone 12 — Confirmación + `FAC-` + snapshot de cliente

**Estado:** pendiente  
**Fecha:**

### Objetivo cumplido

### Qué se entregó

### Decisiones técnicas

### Validación

### Fuera de alcance (intencional)

---

## Milestone 13 — Rentabilidad DOP + frontera Administrator

**Estado:** pendiente  
**Fecha:**

### Objetivo cumplido

### Qué se entregó

### Decisiones técnicas

### Validación

### Fuera de alcance (intencional)

---

## Milestone 14 — COST-005 profit juzgado

**Estado:** pendiente  
**Fecha:**

### Objetivo cumplido

### Qué se entregó

### Decisiones técnicas

### Validación

### Fuera de alcance (intencional)

---

## Milestone 15 — Adaptador FX + pending

**Estado:** pendiente  
**Fecha:**

### Objetivo cumplido

### Qué se entregó

### Decisiones técnicas

### Validación

### Fuera de alcance (intencional)

---

## Milestone 16 — Retry FX Administrator

**Estado:** pendiente  
**Fecha:**

### Objetivo cumplido

### Qué se entregó

### Decisiones técnicas

### Validación

### Fuera de alcance (intencional)

---

## Milestone 17 — PDF generar + estado de fallo

**Estado:** pendiente  
**Fecha:**

### Objetivo cumplido

### Qué se entregó

### Decisiones técnicas

### Validación

### Fuera de alcance (intencional)

---

## Milestone 18 — PDF regenerar Administrator

**Estado:** pendiente  
**Fecha:**

### Objetivo cumplido

### Qué se entregó

### Decisiones técnicas

### Validación

### Fuera de alcance (intencional)

---

## Milestone 19 — Web: customers HTTP

**Estado:** pendiente  
**Fecha:**

### Objetivo cumplido

### Qué se entregó

### Decisiones técnicas

### Validación

### Fuera de alcance (intencional)

---

## Milestone 20 — Web: catálogo de servicios HTTP

**Estado:** pendiente  
**Fecha:**

### Objetivo cumplido

### Qué se entregó

### Decisiones técnicas

### Validación

### Fuera de alcance (intencional)

---

## Milestone 21 — Web: POS draft + líneas soportadas

**Estado:** pendiente  
**Fecha:**

### Objetivo cumplido

### Qué se entregó

### Decisiones técnicas

### Validación

### Fuera de alcance (intencional)

---

## Milestone 22 — Web: confirmación HTTP

**Estado:** pendiente  
**Fecha:**

### Objetivo cumplido

### Qué se entregó

### Decisiones técnicas

### Validación

### Fuera de alcance (intencional)

---

## Milestone 23 — Web: PDF HTTP

**Estado:** pendiente  
**Fecha:**

### Objetivo cumplido

### Qué se entregó

### Decisiones técnicas

### Validación

### Fuera de alcance (intencional)

---

## Milestone 24 — Web: rentabilidad HTTP

**Estado:** pendiente  
**Fecha:**

### Objetivo cumplido

### Qué se entregó

### Decisiones técnicas

### Validación

### Fuera de alcance (intencional)

---

## Milestone 25 — Exit gate Release 2

**Estado:** pendiente  
**Fecha:**

### Objetivo cumplido

### Qué se entregó

### Decisiones técnicas

### Validación

### Fuera de alcance (intencional)
