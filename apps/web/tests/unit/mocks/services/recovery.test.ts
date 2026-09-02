import { describe, expect, it } from 'vitest';

import { createInitialState } from '../../../../src/mocks/data/seed';
import { releaseAbandonedReservation } from '../../../../src/mocks/services/recovery-commands';
import { buildRecoverySnapshot } from '../../../../src/mocks/services/recovery-catalog';
import { isAbandonedDraft } from '../../../../src/mocks/services/recovery-eligibility';

const admin = createInitialState().users.find((user) => user.id === 'U-ADMIN')!;
const seller = createInitialState().users.find((user) => user.id === 'U-LAURA')!;

describe('abandoned reservation recovery', () => {
  it('discards the draft and frees ALT-004', () => {
    const state = createInitialState();
    expect(state.items.find((item) => item.id === 'ALT-004')?.reservedByDraftId).toBe(
      'INV-DRAFT-01',
    );

    const result = releaseAbandonedReservation(state, admin, {
      draftId: 'INV-DRAFT-01',
      reason: 'Borrador abandonado en demostración',
    });

    expect(result.ok).toBe(true);
    expect(state.invoices.some((invoice) => invoice.id === 'INV-DRAFT-01')).toBe(false);
    expect(state.items.find((item) => item.id === 'ALT-004')?.reservedByDraftId).toBeUndefined();
    expect(state.qtyProducts.find((product) => product.id === 'QTY-OIL-15W40')?.reserved).toBe(0);
    expect(state.events.some((event) => event.type === 'RESERVATION_RELEASED')).toBe(true);
  });

  it('requires a reason and rejects sellers', () => {
    const state = createInitialState();
    expect(
      releaseAbandonedReservation(state, admin, { draftId: 'INV-DRAFT-01', reason: '   ' }).ok,
    ).toBe(false);
    expect(
      releaseAbandonedReservation(state, seller, { draftId: 'INV-DRAFT-01', reason: 'No' }).ok,
    ).toBe(false);
  });

  it('does not list or release a Draft before it reaches six hours', () => {
    const state = createInitialState();
    const draft = state.invoices.find((invoice) => invoice.id === 'INV-DRAFT-01')!;
    draft.createdAt = '2026-08-25T10:01:00.000Z';

    const snapshot = buildRecoverySnapshot(state);
    expect(snapshot.abandonedReservations.some((row) => row.draftId === draft.id)).toBe(false);

    const result = releaseAbandonedReservation(state, admin, {
      draftId: draft.id,
      reason: 'Intento prematuro',
    });
    expect(result.ok).toBe(false);
    expect(state.invoices.some((invoice) => invoice.id === draft.id)).toBe(true);
    expect(state.items.find((item) => item.id === 'ALT-004')?.reservedByDraftId).toBe(draft.id);
  });

  it('classifies the Draft as abandoned at exactly six hours', () => {
    const state = createInitialState();
    const draft = state.invoices.find((invoice) => invoice.id === 'INV-DRAFT-01')!;
    draft.createdAt = '2026-08-25T10:00:00.000Z';

    expect(isAbandonedDraft(draft, '2026-08-25T15:59:59.999Z')).toBe(false);
    expect(isAbandonedDraft(draft, '2026-08-25T16:00:00.000Z')).toBe(true);
  });

  it('lists the seed draft as stuck and FAC-000096 as pending FX', () => {
    const snapshot = buildRecoverySnapshot(createInitialState());
    expect(snapshot.abandonedReservations.some((row) => row.draftId === 'INV-DRAFT-01')).toBe(true);
    expect(snapshot.pendingFx.some((row) => row.number === 'FAC-000096')).toBe(true);
  });
});
