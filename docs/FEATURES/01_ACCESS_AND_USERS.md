# Feature 01 — Access and Users

## Status and authority

**CONFIRMED.** This file is the implementation source of truth for requirement IDs: `AUTH-001, AUTH-002, AUTH-003, AUTH-004, AUTH-005`.

The old consolidated requirements/validation files are intentionally no longer required. If another retained document conflicts with a requirement block below, update that retained document rather than weakening this feature specification.

## Delivery

**Release 1 foundation; required before any production business flow**

## What this feature does

Provide individual authenticated access, the fixed Administrator/Seller/Mechanic role model, safe deactivation, and server-side authorization.

## Architecture ownership

This is one product feature with two implementation modules:

- **`access`:** login, logout, session lookup, authentication, active-user checks.
- **`users`:** Administrator user-management commands.

Both modules may share the same user model and user repository.

Follow the project-wide convention in each module:

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

### Confirmed implementation decisions

These decisions close prior documentation gaps and are authoritative for Release 1:

1. **Login identity:** use unique `username` as the login identifier.
2. **First Administrator:** create through a one-time CLI bootstrap command. Do not hardcode production credentials. The bootstrap must reject creating another initial Administrator when any user already exists.
3. **User profile fields (MVP):**
   - `name` — required
   - `username` — required, unique
   - `phone` — optional
   - `email` — optional
   - `role` — required (`ADMINISTRATOR`, `SELLER`, `MECHANIC`)
   - `active` — required
   - `passwordHash` — required
   - `createdAt` / `updatedAt`
   - Do not add other required MVP fields.
4. **Password policy (MVP):** minimum 6 characters; no additional complexity rules in the MVP.
5. **Mechanic scope in Release 1:** verify only a minimal session projection and negative authorization tests. Full Work Order data projection belongs to the release that implements Work Orders.
6. **History in Release 1:** implement the reusable event envelope and record user-lifecycle events only. Other event types are added with their owning features.

### Recommended implementation shape

Use same-origin server-side sessions with secure `HttpOnly` cookies. Authentication establishes identity; authorization is evaluated again at the server for every protected command.

Keep the HTTP layer thin:

```text
access/
  routes
  controller
  service
  repository
  validation
  types

users/
  routes
  controller
  service
  repository
  validation
  types
```

The access service should own login/logout/session invalidation and active-user checks. User-management commands belong to the `users` module but use the same user repository/model. Store password hashes only; never expose or log credentials or session values.

Represent the application role as a fixed enum (`ADMINISTRATOR`, `SELLER`, `MECHANIC`) rather than configurable RBAC. Do not encode authorization only in React. Use operation-level policies/middleware and repeat state-sensitive checks inside services when the action depends on record state.

Deactivation must invalidate future access while preserving historical foreign-key/reference identity. Existing sessions must be revocable or rechecked so a deactivated account cannot continue long-term access.

## Feature-level acceptance criteria

- Active individual credentials can establish a session; invalid or inactive credentials cannot.
- Each active account has exactly one supported role.
- Only Administrator can create/deactivate users or assign roles.
- Server rejects direct unauthorized requests even when the UI is bypassed.
- Deactivation does not erase historical actor attribution.
- Mechanic authorization never grants commercial/financial visibility.

## Implementation checklist

### Backend / domain
- [x] Define fixed role enum and active/inactive user state.
- [x] Implement user repository and unique `username` constraint.
- [x] Implement one-time CLI bootstrap for the first Administrator when no users exist.
- [x] Implement password hashing, minimum 6-character validation, and credential verification.
- [ ] Implement server-side session creation, lookup, rotation, logout, and invalidation.
- [ ] Implement active-account guard.
- [ ] Implement operation-level authorization helpers/policies.
- [ ] Implement Administrator user-management commands in the `users` module.
- [ ] Preserve historical user identity after deactivation.

### Frontend
- [x] Login/logout flow.
- [x] Session-expired / inactive-account handling.
- [x] Administrator user-management screen (`name`, `username`, optional `phone`/`email`, role, active state). Prototype mock: `/users`, `users.manage`, password required on create. Covered by unit, integration, and component tests (WM11).
- [x] Role-aware navigation without treating hidden controls as security. Prototype mock 2.0-M1.2 also hides on-screen actions the role cannot perform (`can()` + route guards).
- [x] Self-service profile edit (own name, optional phone/email, password) for every active role. Username, role, and active stay administrator-managed. Uses `profile.update`, not `users.manage`. Covered by unit, integration, and component tests.

### Tests
- [ ] Valid/invalid/inactive login tests.
- [ ] Role matrix negative tests through direct API requests (Release 1 Mechanic scope: minimal session projection only).
- [ ] Session invalidation after deactivation.
- [ ] Historical records still resolve deactivated actor identity.

## Canonical validated requirements

The blocks below are the final reconciled requirements retained from the previous consolidated catalog. Keep their IDs stable for tests, commits, and traceability.

### AUTH-001 — Individual Accounts

**Name:** Individual user access  
**Status:** CONFIRMED  
**Actors:** Seller, Administrator, Mechanic  
**Requirement:** Each user must access the system through an active individual account.  
**Business Reason:** Operational and financial actions must be attributable to a person.  
**Preconditions:** The account exists and is active.  
**Main Flow:** User submits credentials; the system verifies the account and starts an authenticated session.  
**Business Rules:** Shared anonymous operational accounts are not allowed.  
**Important Exceptions/Edge Cases:** Historical actions remain attributable after account deactivation.  
**Dependencies:** None.  
**Acceptance Notes:** Valid active credentials succeed; invalid or inactive credentials do not.

---

### AUTH-002 — Three-Role Model

**Name:** Administrator, Seller, and Mechanic roles  
**Status:** CONFIRMED  
**Actors:** Administrator, Seller, Mechanic  
**Requirement:** The MVP must use exactly three application roles: Administrator, Seller, and Mechanic, without introducing configurable enterprise RBAC.  
**Business Reason:** Commercial, protected administrative, and physical-work responsibilities require distinct information and authority boundaries.  
**Main Flow:** An Administrator assigns one role; protected behavior follows that role.  
**Business Rules:** Administrator includes normal Seller capabilities plus protected administration; Seller performs normal commercial and inventory operations; Mechanic is limited to the Work Order queue and assigned-order execution with only the information defined by WO-003.  
**Important Exceptions/Edge Cases:** Mechanic is not a general inventory or commercial role and cannot gain Seller visibility through a Work Order assignment.  
**Dependencies:** AUTH-001.  
**Acceptance Notes:** Each active account has exactly one of the three roles, and each protected operation enforces the corresponding boundary.

---

### AUTH-003 — User Management

**Name:** Administrator-managed users  
**Status:** CONFIRMED  
**Actors:** Administrator  
**Requirement:** Administrators may create users, assign Administrator, Seller, or Mechanic, and activate or deactivate accounts.  
**Business Reason:** Access must be controlled without direct data changes.  
**Preconditions:** The acting user is an Administrator.  
**Main Flow:** Administrator enters user information, assigns a role, and saves the account state.  
**Business Rules:** Seller and Mechanic cannot manage accounts or roles.  
**Important Exceptions/Edge Cases:** A unique `username` cannot be assigned to conflicting accounts.  
**Dependencies:** AUTH-001, AUTH-002.  
**Acceptance Notes:** Server-side checks allow Administrators and reject Seller and Mechanic.

---

### AUTH-004 — Deactivation Without History Loss

**Name:** Safe account deactivation  
**Status:** CONFIRMED  
**Actors:** Administrator  
**Requirement:** Deactivation must prevent future login without deleting or anonymizing historical actions.  
**Business Reason:** Former staff must lose access while audit history stays understandable.  
**Preconditions:** The target account exists.  
**Main Flow:** Administrator deactivates the account; active access ends; prior records retain the user identity.  
**Business Rules:** Deactivation is not physical deletion.  
**Important Exceptions/Edge Cases:** Existing sessions must not retain unauthorized long-term access.  
**Dependencies:** AUTH-001, AUTH-003, HIST-002.  
**Acceptance Notes:** A deactivated user cannot authenticate, and prior events still name that user.

---

### AUTH-005 — Server-Side Authorization

**Name:** Enforced authorization  
**Status:** CONFIRMED  
**Actors:** Seller, Administrator, Mechanic  
**Requirement:** Every protected action must be authorized by the server when executed, not only hidden in the interface.  
**Business Reason:** UI-only restrictions can be bypassed and expose sensitive business operations.  
**Preconditions:** An authenticated user requests a protected action.  
**Main Flow:** The system checks identity, role, and action-specific rules before changing data.  
**Business Rules:** Denial leaves business state unchanged.  
**Important Exceptions/Edge Cases:** Stale sessions and direct requests receive the same checks.  
**Dependencies:** AUTH-001, AUTH-002.  
**Acceptance Notes:** Unauthorized direct action attempts fail without partial changes.
