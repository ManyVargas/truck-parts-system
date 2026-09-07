# Release 2 — Registro de lo implementado

**Release:** Billing Core  
**Plan de referencia:** [`../plans_api/plan_release_2.md`](../plans_api/plan_release_2.md)  
**Estado:** en curso (M1–M7 completados)

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

**Estado:** completado  
**Fecha:** 2026-09-07

### Objetivo cumplido

CRUD Administrator y lectura Seller de servicios activos, con history en la misma transacción.

### Qué se entregó

- Módulo `catalogs` HTTP: routes → controller → service → repository.
- `GET/POST /api/catalogs/services`, `GET/PATCH /api/catalogs/services/:id`.
- Admin escribe; Seller lista/lee activos; Mechanic 403; CSRF en escrituras.
- History `SERVICE_CREATED` / `SERVICE_UPDATED` (`subjectType: MECHANICAL_SERVICE`).

### Decisiones técnicas

- Seller GET de inactivo o inexistente → 404 (no filtra solo en UI).
- Desactivar es `PATCH { active: false }`; no hay DELETE.
- Precio sigue fuera del catálogo. Isolation Serializable + re-chequeo de rol.

### Validación

- Integration: `apps/api/tests/integration/catalogs/http.test.ts`
- Unit history: `apps/api/tests/unit/catalogs/history-validation.test.ts`

### Fuera de alcance (intencional)

Línea SERVICE en draft (M9). Swap `HttpServiceRepository` (M20). Categorías de inventario (R4).

---

## Milestone 5 — Motor de cálculo ITBIS y redondeo

**Estado:** completado  
**Fecha:** 2026-09-07

### Objetivo cumplido

Funciones puras decimal-safe para ITBIS 18 % incluido y redondeo por línea.

### Qué se entregó

- `apps/api/src/features/sales/money/`: `calculateLineMoney`, `sumInvoiceMoney`, `roundMoney`, helpers de costo UNKNOWN.
- Unit tests SALE-003 (fiscal/no fiscal, gravado/exento, multi-línea).

### Decisiones técnicas

- `Prisma.Decimal` y HALF_UP a 2 decimales; no `number` flotante.
- ITBIS incluido solo si `fiscal === true` y la línea es gravable (GENERIC/EXTERNAL/ITEM/QTY).
- Totales = suma de líneas ya redondeadas; no extraer el 18 % del bruto combinado.
- UNKNOWN no se trata como 0. Entrega `0` es válida.

### Validación

- Unit: `apps/api/tests/unit/sales/money.test.ts`

### Fuera de alcance (intencional)

HTTP de draft (M7+). Persistencia de factura (M6). Profit (M13).

---

## Milestone 6 — Esquema Invoice, líneas y secuencia `FAC-`

**Estado:** completado  
**Fecha:** 2026-09-07

### Objetivo cumplido

Agregado Invoice / InvoiceLine y fila de secuencia `FAC-` en PostgreSQL, sin draft HTTP.

### Qué se entregó

- Migración `20260907180000_invoice_aggregate`.
- Enums `InvoiceStatus`, `InvoiceCurrency`, `InvoiceLineType`, `CostProvenance`.
- `SalesRepository`: `createDraft`, `findById`, `addLine`, `findSequence`, `lockSequenceForUpdate`.

### Decisiones técnicas

- Draft: `number` NULL. COMPLETED/CANCELLED exigen número (check SQL).
- Una moneda por factura (`DOP` | `USD`). `fiscal` en cabecera.
- Línea: descripción, cantidad, `unitPrice`, costo DOP + provenance, `serviceId` solo en SERVICE.
- ITEM/QTY existen en el discriminador para rechazarlos después; sin FKs de inventario.
- Secuencia singleton `FAC`, `nextValue` inicia en 1; lock `SELECT … FOR UPDATE` sin consumir.
- Checks: UNKNOWN ≠ 0; ACTUAL/ESTIMATED con monto; precio ≥ 0.

### Validación

- Integration: `apps/api/tests/integration/sales/repository.test.ts`

### Fuera de alcance (intencional)

HTTP de draft (M7). Confirmación / asignación `FAC-` (M12). Snapshot de cliente, pagos, PDF, FX.

---

## Milestone 7 — Draft HTTP cáscara

**Estado:** completado  
**Fecha:** 2026-09-07

### Objetivo cumplido

Crear, leer, listar, ajustar meta y descartar drafts HTTP, sin líneas ni `FAC-`.

### Qué se entregó

- Módulo `sales` HTTP: routes → controller → service → repository.
- `GET/POST /api/sales`, `GET/PATCH/DELETE /api/sales/:id`.
- POST con `currency` / `fiscal` / `customerId` opcionales; default `Cliente contado` + `DOP` + no fiscal.
- Listado de todas las facturas, filtro `status`, paginación `page` / `pageSize`.
- Descarte = borrado físico de `DRAFT`; COMPLETED/CANCELLED → 409.
- Seller/Administrator ALLOW; Mechanic 403; CSRF en escrituras.
- History `INVOICE_DRAFT_CREATED` / `INVOICE_DRAFT_UPDATED` / `INVOICE_DRAFT_DISCARDED`.
- `satisfiesFiscalIdentity`: fiscal + `Cliente contado` (u otro sin RNC/Cédula) → 409.

### Decisiones técnicas

- Totales de GET se derivan con el motor de M5 (draft vacío = `0.00`); no hay columnas de totales.
- Isolation Serializable + re-chequeo de rol, igual que customers.
- DELETE físico; history queda con `subjectId` del draft eliminado.

### Validación

- Integration: `apps/api/tests/integration/sales/http.test.ts`
- Unit: `apps/api/tests/unit/sales/validation.test.ts`, `apps/api/tests/unit/sales/history-validation.test.ts`

### Fuera de alcance (intencional)

`addLine` / líneas (M8–M11). Confirmación / `FAC-` (M12). Swap POS (M21).

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
