# Feature 09 — Draft Reservations

## Status and authority

**CONFIRMED.** This file is the implementation source of truth for requirement IDs: `RES-001, RES-002, RES-003`.

The old consolidated requirements/validation files are intentionally no longer required. If another retained document conflicts with a requirement block below, update that retained document rather than weakening this feature specification.

## Delivery

**Release 5 — Inventory-Backed Sales**

## What this feature does

Hold eligible unique items, quantities, and overlapping assembly inventory while a Draft is open, without marking stock Sold or relying on automatic expiry.

## Architecture ownership

Primary logical module: **reservations**.

Follow the project-wide convention:

```text
feature/
  routes
  controller
  service
  repository
  validation
  types
```

Controllers translate HTTP only. Business rules belong in services. Prisma/database access belongs in repositories or transaction-aware persistence helpers. Server-side authorization and runtime validation are mandatory.

## How to implement it

### Recommended implementation shape

Reservations are owned by the Draft/sale-preparation workflow and are not inventory availability states. A Draft reservation prevents competing use but leaves the underlying item commercially Available until successful confirmation.

Use database uniqueness/conditional constraints to prevent two active reservations for the same unique unit and to protect quantity availability. Assembly reservations must detect parent/descendant overlap as required by the sale model.

Reservations release when a line is removed, the Draft is discarded, or successful confirmation consumes them. Drafts do **not** expire automatically. Abandoned reservations are released only through a named Administrator recovery operation.

Confirmation must always reread/revalidate current stock, hierarchy, restrictions, and reservation ownership; possession of a reservation is not proof that confirmation is still safe.

## Feature-level acceptance criteria

- Draft reservation prevents competing promise/use of the same stock.
- Reservation does not mark inventory Sold.
- Competing unique/quantity/overlapping assembly reservations produce valid winners only.
- Line removal/discard/confirmation releases or consumes exactly the owned reservation.
- Time passage alone never releases a reservation.
- Administrator can recover an abandoned reservation through an audited named operation.
- Confirmation revalidates critical state.

## Implementation checklist

### Domain / persistence
- [ ] Define reservation ownership, status, line linkage, and version.
- [ ] Unique-item active reservation constraint.
- [ ] Quantity atomic reserve/release logic.
- [ ] Assembly overlap eligibility checks.
- [ ] Draft line-change synchronization.
- [ ] Discard/confirmation release/consume behavior.
- [ ] Administrator abandoned-reservation recovery.
- [ ] No scheduled expiry job.

### Frontend
- [ ] Show reservation conflicts clearly.
- [ ] Release reservation on line removal/discard.
- [ ] Administrator recovery view for abandoned Drafts.

### Tests
- [ ] Two-Draft unique item race.
- [ ] Quantity oversubscription race.
- [ ] Parent/descendant overlap cases.
- [ ] No expiry after simulated time.
- [ ] Idempotent release/consume behavior.

## Canonical validated requirements

The blocks below are the final reconciled requirements retained from the previous consolidated catalog. Keep their IDs stable for tests, commits, and traceability.

### RES-001 — Draft Reservation

**Name:** Draft holds inventory  
**Status:** CONFIRMED  
**Actors:** Seller, Administrator  
**Requirement:** Adding eligible individual or quantity inventory to a Draft invoice must reserve it until the line or draft is released.  
**Business Reason:** The owner requires drafts to prevent the same stock being promised elsewhere.  
**Preconditions:** The item or requested quantity is Available and unreserved.  
**Main Flow:** User adds a line; the system creates a reservation and excludes that stock from other reservations.  
**Business Rules:** Reservation is separate from availability and does not mark inventory Sold.  
**Important Exceptions/Edge Cases:** Assembly reservations include descendants and must reject overlapping child/parent reservations.  
**Dependencies:** INV-003, INV-004, QTY-002, HIER-010.  
**Acceptance Notes:** A second draft cannot reserve the same individual item or unavailable quantity.

---

### RES-002 — Reservation Release

**Name:** Release discarded draft stock  
**Status:** CONFIRMED  
**Actors:** Seller, Administrator  
**Requirement:** Removing a reserved line or intentionally discarding its Draft must release all associated individual, quantity, and descendant reservations.  
**Business Reason:** Abandoned sales must not permanently block inventory.  
**Preconditions:** An active reservation exists.  
**Main Flow:** User removes the line or discards the draft; the system atomically releases its reservations and records the action.  
**Business Rules:** Release does not change inventory to Sold or alter hierarchy.  
**Important Exceptions/Edge Cases:** A confirmation already in progress must resolve atomically as confirmation or release, never both partially.  
**Dependencies:** RES-001, HIST-001.  
**Acceptance Notes:** Released stock becomes reservable again with no orphan reservations.

---

### RES-003 — Draft Expiry and Recovery

**Name:** No automatic Draft expiry  
**Status:** CONFIRMED  
**Actors:** Seller, Administrator  
**Requirement:** A Draft and its reservations must remain open until an eligible business action removes a line, discards or confirms the Draft, or Administrator releases an abandoned Draft/reservation through Operational Recovery.  
**Business Reason:** Negotiations have no validated timeout, and stock must not be released silently while a Draft remains active.  
**Main Flow:** Seller or Administrator maintains, discards, or confirms the Draft. If it is abandoned, Administrator reviews it and uses the named recovery release operation with preserved history.  
**Business Rules:** There is no automatic timeout, inactivity countdown, scheduled expiration, auto-release job, warning-renewal cycle, or browser-loss expiry.  
**Important Exceptions/Edge Cases:** Recovery must not release a reservation consumed by confirmation, and a race between confirmation and recovery permits only one atomic outcome.  
**Dependencies:** RES-001, RES-002, AUTH-004, ADMIN-002.  
**Acceptance Notes:** An untouched Draft remains reserved until a named eligible action occurs; no passage of time alone releases it.
