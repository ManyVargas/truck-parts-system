# Feature 04 — Categories and Controlled Attributes

## Status and authority

**CONFIRMED.** This file is the implementation source of truth for requirement IDs: `CAT-001, CAT-002, CAT-003`.

The old consolidated requirements/validation files are intentionally no longer required. If another retained document conflicts with a requirement block below, update that retained document rather than weakening this feature specification.

## Delivery

**Release 4, with expected-component definitions also used by Release 6 hierarchy baseline**

## What this feature does

Give Administrator-controlled categories, small category-specific field sets, and expected-component definitions without turning the system into a generic metadata/BOM platform.

## Architecture ownership

Primary logical module: **categories**.

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

Administrator maintains category definitions and small controlled options. Categories describe what data is required/allowed; they do not create physical inventory.

Use a practical shared inventory base plus a controlled category-specific structure. A JSONB payload is acceptable for a small bounded set of category attributes if it is validated by category-specific schemas and not exposed as arbitrary user-defined metadata.

Assembly categories may own general Expected Component Definitions. These are templates/checklist definitions only. On receipt, the concrete assembly baseline evaluates each definition as `PRESENT`, `MISSING`, or `NOT_APPLICABLE`; definitions themselves never receive inventory IDs.

Tire and Rim keep their validated specific fields rather than being forced into universal columns.

## Feature-level acceptance criteria

- Only Administrator can maintain categories/controlled options/expected-component definitions.
- Seller can use configured categories but cannot redefine them.
- Category definitions never create stock.
- Category minimum validation is applied at registration.
- Tire and Rim validated attributes are supported.
- Expected-component definitions remain distinct from real items and Known Missing Components.

## Implementation checklist

### Domain / persistence
- [ ] Define category records and active/usable behavior.
- [ ] Define validated category attribute schemas.
- [ ] Define expected-component definitions for assembly categories.
- [ ] Implement Administrator catalog CRUD with history.
- [ ] Preserve historical references if a catalog entry is later changed/deactivated.
- [ ] Implement Tire and Rim specific validation.

### Frontend
- [ ] Administrator category management.
- [ ] Expected-component definition management.
- [ ] Mechanical/service catalog remains handled by Sales/Admin integration as specified.
- [ ] Dynamic but bounded registration fields based on selected category.

### Tests
- [ ] Seller/Mechanic catalog-maintenance denial.
- [ ] Invalid category-specific attributes rejected.
- [ ] Catalog changes do not rewrite historical inventory/invoices.
- [ ] Definitions do not create physical item identities.

## Canonical validated requirements

The blocks below are the final reconciled requirements retained from the previous consolidated catalog. Keep their IDs stable for tests, commits, and traceability.

### CAT-001 — Category Minimums and Attributes

**Name:** Category-specific registration rules  
**Status:** CONFIRMED  
**Actors:** Seller, Administrator  
**Requirement:** Administrator must maintain small inventory-category definitions and one general expected-component list for each category treated as an assembly. Categories use the practical shared inventory base plus small relevant category-specific fields.  
**Business Reason:** Engines, trucks, tires, rims, and generic parts do not share one useful field set, and an assembly needs an honest received-composition review without fake inventory.  
**Preconditions:** The category definition is available sufficiently for the attempted registration.  
**Main Flow:** Administrator maintains category and expected-component definitions. Seller or Administrator selects a category during registration. For a concrete assembly baseline, the actor reviews each general expected definition as `PRESENT`, `MISSING`, or `NOT_APPLICABLE`.  
**Business Rules:** `PRESENT` requires a real individually tracked item; `MISSING` records a `MISSING_AT_RECEIPT` Known Missing Component and no inventory identity; `NOT_APPLICABLE` creates neither and does not affect completeness. Definitions remain separate from real inventory and absence records. Lists are category-scoped rather than per-model. Not every category is an assembly. Avoid manufacturing-BOM, ERP product-master, generic metadata, and complex catalog-versioning behavior.  
**Important Exceptions/Edge Cases:** Exact initial catalog values, simple repeated-component matching, and input/display normalization are operational or implementation details, not architecture or scope-freeze blockers. Historical records must remain intelligible after catalog edits.  
**Dependencies:** HIER-006.  
**Acceptance Notes:** Catalog creation never creates physical stock; one general assembly-category list supports per-unit applicability, and representative values may be supplied for prototype/testing without hardcoding the complete real-world catalog.

---

### CAT-002 — Tire Information

**Name:** Tire-specific attributes  
**Status:** CONFIRMED  
**Actors:** Seller, Administrator  
**Requirement:** Tire records must support tire type, size, and diameter.  
**Business Reason:** These properties are necessary to identify and sell tires correctly.  
**Main Flow:** User selects Tire and records the applicable values.  
**Business Rules:** Type, size, and diameter are sufficient Tire-specific fields for MVP; normal shared inventory fields still apply.  
**Important Exceptions/Edge Cases:** Input/display normalization is non-blocking; no additional Tire-specific mandatory fields may be invented.  
**Dependencies:** CAT-001, INV-002, QTY-001.  
**Acceptance Notes:** Tire data can be captured and searched once formats are approved.

---

### CAT-003 — Rim Information

**Name:** Rim-specific attributes  
**Status:** CONFIRMED  
**Actors:** Seller, Administrator  
**Requirement:** Rim records must support material/type, such as reinforced steel or aluminum, and size.  
**Business Reason:** These properties distinguish commercially relevant rim variants.  
**Main Flow:** User selects Rim and records material/type and size.  
**Business Rules:** Material/type and size are sufficient Rim-specific fields for MVP; normal shared inventory fields still apply.  
**Important Exceptions/Edge Cases:** Controlled-value or display normalization is non-blocking; no additional Rim-specific mandatory fields may be invented.  
**Dependencies:** CAT-001, INV-002, QTY-001.  
**Acceptance Notes:** Rim data can be captured and searched once formats are approved.
