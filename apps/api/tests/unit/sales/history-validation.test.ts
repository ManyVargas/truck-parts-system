import { describe, expect, it } from 'vitest';

import { historyEventSchema } from '../../../src/features/history/validation.js';

const id = '11111111-1111-4111-8111-111111111111';
const snapshot = {
  status: 'DRAFT' as const,
  number: null,
  currency: 'DOP' as const,
  fiscal: false,
  customerId: id,
};

describe('invoice draft history validation', () => {
  it('accepts INVOICE_DRAFT_CREATED with a USER actor and rejects extra payload fields', () => {
    const event = {
      actor: { actorType: 'USER' as const, actorUserId: id },
      subjectType: 'INVOICE' as const,
      subjectId: id,
      eventType: 'INVOICE_DRAFT_CREATED' as const,
      payload: snapshot,
    };
    expect(historyEventSchema.parse(event)).toEqual(event);
    expect(
      historyEventSchema.safeParse({
        ...event,
        payload: { ...snapshot, passwordHash: 'secret' },
      }).success,
    ).toBe(false);
    expect(
      historyEventSchema.safeParse({
        ...event,
        actor: { actorType: 'SYSTEM', actorUserId: null },
      }).success,
    ).toBe(false);
  });

  it('accepts INVOICE_LINE_ADDED and rejects extra payload fields', () => {
    const event = {
      actor: { actorType: 'USER' as const, actorUserId: id },
      subjectType: 'INVOICE' as const,
      subjectId: id,
      eventType: 'INVOICE_LINE_ADDED' as const,
      payload: {
        id,
        type: 'GENERIC' as const,
        description: 'Filtro',
        quantity: '1.00',
        unitPrice: '118.00',
        acquisitionCostDop: null,
        costProvenance: 'UNKNOWN' as const,
        serviceId: null,
      },
    };
    expect(historyEventSchema.parse(event)).toEqual(event);
    const externalEvent = {
      ...event,
      payload: { ...event.payload, type: 'EXTERNAL' as const, description: 'Bomba externa' },
    };
    expect(historyEventSchema.parse(externalEvent)).toEqual(externalEvent);
    expect(
      historyEventSchema.safeParse({
        ...event,
        payload: { ...event.payload, passwordHash: 'secret' },
      }).success,
    ).toBe(false);
  });
});
