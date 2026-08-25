# Feature 11 — Acquisition Cost and Profitability

## Status and authority

**CONFIRMED.** This file is the implementation source of truth for requirement IDs: `COST-001, COST-002, COST-003, COST-004`.

The old consolidated requirements/validation files are intentionally no longer required. If another retained document conflicts with a requirement block below, update that retained document rather than weakening this feature specification.

## Delivery

**Release 2 minimal support for resale/cost fields; completed in Release 4/5 with inventory and USD profitability**

## What this feature does

Preserve acquisition cost in DOP, distinguish actual/estimated/unknown cost, calculate invoice-currency gross profit safely, and expose profitability only to Administrator.

## Architecture ownership

Primary logical module: **costs / profitability**.

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

Store acquisition cost only in DOP for tracked inventory, quantity weighted-average stock, external resale lines, and estimates. If a purchase happened in another currency, the employee converts it outside the application. Preserve cost provenance/state so unknown is never treated as zero.

Profitability is derived from immutable sale snapshots, not live current inventory cost. For DOP invoices, subtract stored DOP cost directly. For USD invoices only, use an external FX adapter to obtain/normalize `exchangeRateDopPerUsd` and compute:

`costUsd = storedCostDop / exchangeRateDopPerUsd`

The FX lookup is a secondary profitability enrichment, not a commercial dependency. If unavailable, confirmation still succeeds and profitability is `UNAVAILABLE / PENDING FX RATE`. A named Administrator recovery can retry later without rerunning the sale. Preserve normalized rate value, source/provider, relevant rate time/date, and calculation time.

Seller and Administrator may view acquisition cost. Only Administrator may view gross profit, margin, aggregate profitability, or pending-profitability diagnostics.

## Feature-level acceptance criteria

- Acquisition cost is always stored in DOP and may be actual, estimated, or unknown.
- Unknown cost never becomes zero implicitly.
- Completed sale snapshots preserve the cost basis used at confirmation.
- DOP profit needs no FX.
- USD profitability uses normalized DOP-per-USD division convention.
- FX failure never blocks confirmation and never invents a rate.
- Retry changes only profitability enrichment, not invoice/inventory/payment state.
- Seller cannot access profit/margin while Administrator can.

## Implementation checklist

### Domain / persistence
- [ ] Define cost amount + actual/estimated/unknown provenance.
- [ ] Snapshot applicable cost basis on completed sale lines.
- [ ] Implement DOP gross-profit calculation.
- [ ] Implement FX adapter interface and normalization to DOP-per-USD.
- [ ] Persist FX provenance and profitability status.
- [ ] Implement pending-profitability retry command.
- [ ] Implement protected acquisition-cost correction with history.
- [ ] Enforce Administrator-only profitability projections.

### Tests
- [ ] Known/estimated/unknown cost cases.
- [ ] DOP calculation.
- [ ] USD division/rate-direction tests.
- [ ] FX timeout/error still confirms sale.
- [ ] Retry never reruns sale or changes payments.
- [ ] Seller profit endpoint/field denial.

## Canonical validated requirements

The blocks below are the final reconciled requirements retained from the previous consolidated catalog. Keep their IDs stable for tests, commits, and traceability.

### COST-001 — Acquisition Cost

**Name:** Actual, estimated, or unknown acquisition cost  
**Status:** CONFIRMED  
**Actors:** Seller, Administrator  
**Requirement:** Applicable inventory and resale lines must preserve acquisition cost in `DOP` as actual, manually estimated, or unknown, and both Seller and Administrator may view it.  
**Business Reason:** The owner replaced reference-price/discount tracking with actual cost and profitability, and a single stored cost currency keeps that cost comparable across `DOP` and `USD` sales.  
**Main Flow:** An authorized workflow records a known or estimated `DOP` cost or explicitly leaves it unknown; confirmation snapshots the cost value and provenance used by the sale.  
**Business Rules:** Acquisition cost is always stored in `DOP`, including individually tracked inventory, weighted-average quantity cost, externally sourced resale cost, and an entered estimate; the employee performs any purchase-currency conversion outside the application and enters the DOP-equivalent amount. Unknown must never be silently replaced with zero; acquisition cost is not a suggested selling price; Mechanic cannot view it; Seller may view but may not edit protected acquisition cost; Administrator corrections use INV-006.  
**Important Exceptions/Edge Cases:** The MVP preserves no original purchase currency, no manual purchase conversion rate, and no supplier or import exchange-rate accounting; a part actually bought for `USD 200` is stored only as its DOP-equivalent cost such as `DOP 12,300.00`. A component acquired within an assembly may use a manual estimate or remain unknown; the system must not invent, equally divide, proportionally allocate, or residually allocate assembly cost; quantity cost uses QTY-003.  
**Dependencies:** AUTH-005.  
**Acceptance Notes:** Seller and Administrator can view the `DOP` cost and provenance, Mechanic cannot, unknown remains distinguishable from zero and from an estimate, and later edits cannot rewrite completed snapshots.

---

### COST-002 — Final Selling Price

**Name:** Seller-entered negotiated price  
**Status:** CONFIRMED  
**Actors:** Seller, Administrator  
**Requirement:** The seller must enter the final agreed selling price for each chargeable line; the software does not enforce the owner's physical approval conversation.  
**Business Reason:** Prices are negotiated, and approval currently occurs outside the system.  
**Main Flow:** User enters the agreed amount; invoice totals use that amount.  
**Business Rules:** Do not calculate or present a reference-price discount as the primary model. Invoice monetary values use the invoice currency and two decimal places.  
**Important Exceptions/Edge Cases:** Numeric-zero no-charge delivery is allowed under LINE-006; textual monetary placeholders and invalid negative prices are rejected.  
**Dependencies:** LINE-001 through LINE-006.  
**Acceptance Notes:** Invoice uses the entered final price and contains no required reference-price/discount workflow.

---

### COST-003 — Gross Profit

**Name:** Calculate gross profit when cost is known  
**Status:** CONFIRMED  
**Actors:** Administrator  
**Requirement:** The system must calculate and preserve gross profit in the invoice currency from final selling price minus the applicable actual or estimated acquisition cost, which is stored in `DOP`, at useful line and sale levels; when cost is unknown, gross profit is unavailable.  
**Business Reason:** The owner wants profitability statistics rather than discount reporting, and cost stored in one currency must still yield profit in the currency the customer was invoiced in.  
**Preconditions:** A known actual or estimated `DOP` cost basis exists for calculation. A `USD` invoice additionally needs an applicable exchange rate.  
**Main Flow:** Confirmation snapshots final price, the `DOP` cost basis, and provenance. For a `DOP` invoice the system subtracts the stored `DOP` cost directly, for example `DOP 18,000.00` minus `DOP 12,300.00` giving `DOP 5,700.00`. For a `USD` invoice the system obtains an applicable exchange rate from the external FX-rate provider, normalizes it to `exchangeRateDopPerUsd`, derives `costUsd = storedCostDop / exchangeRateDopPerUsd`, and subtracts that USD-equivalent basis from the `USD` selling price. When cost is unknown or a required rate is unavailable, profit is recorded as unavailable for authorized administration.  
**Business Rules:** This is gross profit, not full accounting net profit; unknown cost is not zero cost and must never produce invented profit; displayed invoice profitability values use two decimal places. The stored `DOP` acquisition cost is never changed by a profitability calculation. `exchangeRateDopPerUsd` means the `DOP` required for `1 USD`, so `1 USD = DOP 61.50` gives `61.50`; a provider returning the inverse or another representation must be normalized to this convention before calculating. A successful `USD` calculation preserves the normalized rate value, the provider or source, the relevant rate date/time, and the time the rate was obtained and the calculation completed. A completed profitability result must not silently change because live rates moved. Conversion here is only a profitability calculation and never authorizes cross-currency invoices, payments, balances, or refunds.  
**Important Exceptions/Edge Cases:** An unavailable FX provider must not reject invoice confirmation, block the sale, block reservation consumption, or block inventory becoming `Sold`, and must not invent a rate or a profit; the invoice confirms normally and profitability becomes `UNAVAILABLE / PENDING FX RATE` with a reason such as `Exchange rate unavailable for USD profitability calculation.` A later safe retry may complete the calculation once the applicable rate is available, preserving the rate provenance without rerunning the sale, reselling inventory, modifying payments, or reconfirming the PDF as a sale; recovery must not present an unrelated later live rate as though it had been the sale-time rate. An audited `Completed`/no-payment currency correction under INV-006 re-derives profitability under the corrected currency. Estimated-cost profit is allowed but must remain distinguishable from actual-cost profit; quantity stock uses weighted average and assembly components are never automatically allocated cost.  
**Dependencies:** COST-001, COST-002, QTY-003.  
**Acceptance Notes:** A `DOP` invoice calculates profit with no exchange rate involved; a `USD` invoice divides the stored `DOP` cost by `exchangeRateDopPerUsd` and preserves the rate and its provenance; actual and estimated examples calculate correctly with provenance; unknown-cost examples show profit unavailable rather than a numeric result; an unavailable rate leaves a valid confirmed sale with pending profitability rather than a rejected sale or an invented number.

---

### COST-004 — Administrator-Only Profitability

**Name:** Administrator-only profitability access  
**Status:** CONFIRMED  
**Actors:** Administrator  
**Requirement:** Gross profit, margins, and profitability statistics must be visible only to Administrators, while Seller may view acquisition cost without receiving those derived values.  
**Business Reason:** The owner explicitly restricted profitability information.  
**Main Flow:** Administrator opens authorized profit information; other users are denied server-side.  
**Business Rules:** Seller and Mechanic cannot view or receive gross profit, margin, or profitability statistics; authorization must be enforced server-side. A pending or unresolved profitability result, including `UNAVAILABLE / PENDING FX RATE` and its reason and any preserved rate provenance, is also Administrator-only.  
**Important Exceptions/Edge Cases:** Unknown component cost makes profit unavailable; estimated cost may support an explicitly identified estimate but does not authorize automatic assembly allocation. Seller cost visibility remains a `DOP` acquisition-cost value and never becomes profitability access, including for a `USD` invoice whose profitability is pending.  
**Dependencies:** AUTH-005, COST-003, HIER-001.  
**Acceptance Notes:** Administrator can access allowed known/estimated profitability; Seller can see acquisition cost but not profit or margin; Mechanic sees neither.
