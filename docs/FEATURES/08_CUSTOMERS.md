# Feature 08 — Customers and Invoice Customer Snapshot

## Status and authority

**CONFIRMED.** This file is the implementation source of truth for requirement IDs: `CUST-001, CUST-002, CUST-003`.

The old consolidated requirements/validation files are intentionally no longer required. If another retained document conflicts with a requirement block below, update that retained document rather than weakening this feature specification.

## Delivery

**Release 2 — Billing Core**

## What this feature does

Support reusable customer information, a default `Cliente contado` for eligible nonfiscal sales, and immutable customer details on completed invoices.

## Architecture ownership

Primary logical module: **customers**.

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

Customers are lightweight reusable records, not a CRM. Keep name, phone, RNC/Cédula, address, notes, and only the validated requiredness rules.

Provide a stable generic customer such as `Cliente contado` for eligible nonfiscal counter sales. Do not allow that generic identity to satisfy fiscal RNC/Cédula requirements.

At invoice confirmation, copy the applicable customer data into an immutable invoice customer snapshot. Later edits to the reusable customer record must not alter already completed invoices.

## Feature-level acceptance criteria

- Seller/Administrator can find, create, and edit ordinary customer data.
- Eligible nonfiscal sale can use `Cliente contado`.
- Fiscal-value invoice rejects missing required customer identity.
- Completed invoice preserves its customer snapshot when the source customer is later edited.
- Mechanic has no customer access.

## Implementation checklist

### Backend
- [x] Define customer record and generic-customer strategy. *(prototipo mock: C0 bloqueado; persistencia en sesión)*
- [x] Implement create/search/edit. *(WM4 — `MockCustomerRepository`)*
- [x] Implement fiscal identity validation hook used by Sales. *(prototipo mock — WM8 `setDraftMeta` / `confirmInvoice`)*
- [x] Implement immutable invoice customer snapshot at confirmation. *(prototipo mock — WM8)*
- [x] Prevent completed snapshots from following later customer edits. *(prototipo mock — WM8)*

### Frontend
- [x] Customer search/select/create inside Draft flow. *(WM8: selector en POS; alta sigue en `/customers`)*
- [x] Default `Cliente contado` behavior. *(WM8 `createDraft` usa C0; fiscal lo rechaza)*
- [x] Fiscal-required field feedback. *(checkbox bloqueado + rechazo en servicio)*
- [x] Basic customer maintenance. *(WM4 — `/customers`)*

### Tests
- [x] Generic nonfiscal sale succeeds. *(prototipo mock — C0 + `fiscal: false`)*
- [x] Generic fiscal sale rejected. *(prototipo mock — WM8)*
- [x] Later customer edit leaves completed invoice unchanged. *(prototipo mock — WM8 snapshot)*
- [x] Mechanic access denied. *(WM4 — `customers.manage` en repositorio)*

## Canonical validated requirements

The blocks below are the final reconciled requirements retained from the previous consolidated catalog. Keep their IDs stable for tests, commits, and traceability.

### CUST-001 — Basic Customer Records

**Name:** Reusable customer information  
**Status:** CONFIRMED  
**Actors:** Seller, Administrator  
**Requirement:** Users may create and find customers using name, phone, RNC/Cédula, address, and notes as applicable.  
**Business Reason:** Sales need buyer identity without building a CRM.  
**Main Flow:** User finds an existing customer or creates one during a draft.  
**Business Rules:** Nonfiscal sales require only the approved minimum.  
**Important Exceptions/Edge Cases:** Duplicate-person handling should not block a sale unless a required fiscal identifier conflicts.  
**Dependencies:** AUTH-001.  
**Acceptance Notes:** Customer creation and selection work without losing draft contents.

---

### CUST-002 — Generic Customer

**Name:** Default cash customer  
**Status:** CONFIRMED  
**Actors:** Seller, Administrator  
**Requirement:** The system must permit a generic default customer such as `Cliente contado` for eligible nonfiscal sales.  
**Business Reason:** Many counter sales do not require named-customer registration.  
**Main Flow:** User retains the default customer and completes a nonfiscal invoice.  
**Business Rules:** Generic customer cannot satisfy a fiscal requirement for customer RNC/Cédula.  
**Important Exceptions/Edge Cases:** A sale requiring fiscal identification must select or create a qualifying customer.  
**Dependencies:** CUST-001, SALE-003.  
**Acceptance Notes:** Nonfiscal generic sale succeeds; fiscal validation rejects missing required identity.

---

### CUST-003 — Invoice Customer Snapshot

**Name:** Preserve customer details used at sale  
**Status:** CONFIRMED  
**Actors:** Seller, Administrator  
**Requirement:** A completed invoice must preserve the customer identity and details used at confirmation, including required RNC/Cédula for fiscal documents.  
**Business Reason:** Later customer edits must not rewrite issued documents.  
**Preconditions:** A valid draft and customer selection exist.  
**Main Flow:** Confirmation copies the applicable customer information into the invoice record.  
**Business Rules:** Fiscal documents require the validated fiscal identity fields.  
**Important Exceptions/Edge Cases:** Final PDF placement and legal/footer presentation of fiscal fields remain later output-design details; they do not reopen core invoice behavior.  
**Dependencies:** CUST-001, CUST-002, SALE-003.  
**Acceptance Notes:** Editing a customer after sale does not change the completed invoice.
