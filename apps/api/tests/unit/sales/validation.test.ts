import { describe, expect, it } from 'vitest';

import {
  COST_AMOUNT_REQUIRED_MESSAGE,
  UNKNOWN_COST_AMOUNT_MESSAGE,
} from '../../../src/features/sales/constants.js';
import {
  addInvoiceLineSchema,
  createDraftSchema,
  deliveryDraftLineSchema,
  genericDraftLineSchema,
  serviceDraftLineSchema,
  setLinePriceSchema,
  updateDraftMetaSchema,
} from '../../../src/features/sales/validation.js';

describe('draft HTTP validation', () => {
  it('accepts an empty create body and optional overrides', () => {
    expect(createDraftSchema.parse({})).toEqual({});
    expect(
      createDraftSchema.parse({
        currency: 'USD',
        fiscal: false,
        customerId: '11111111-1111-4111-8111-111111111111',
      }),
    ).toEqual({
      currency: 'USD',
      fiscal: false,
      customerId: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('rejects empty meta patches and unknown fields', () => {
    expect(updateDraftMetaSchema.safeParse({}).success).toBe(false);
    expect(createDraftSchema.safeParse({ currency: 'EUR' }).success).toBe(false);
    expect(createDraftSchema.safeParse({ extra: true }).success).toBe(false);
  });
});

describe('draft GENERIC line validation', () => {
  it('accepts GENERIC with string money and UNKNOWN without an amount', () => {
    expect(
      genericDraftLineSchema.parse({
        type: 'GENERIC',
        description: 'Filtro',
        unitPrice: '118.00',
        costProvenance: 'UNKNOWN',
      }),
    ).toEqual({
      type: 'GENERIC',
      description: 'Filtro',
      unitPrice: '118.00',
      costProvenance: 'UNKNOWN',
    });
    expect(addInvoiceLineSchema.parse({ type: 'ITEM' })).toEqual({ type: 'ITEM' });
    expect(setLinePriceSchema.parse({ unitPrice: '50.00' })).toEqual({ unitPrice: '50.00' });
  });

  it('rejects numeric money, UNKNOWN with amount, missing actual cost, and extra fields', () => {
    expect(
      genericDraftLineSchema.safeParse({
        type: 'GENERIC',
        description: 'Filtro',
        unitPrice: 118,
        costProvenance: 'UNKNOWN',
      }).success,
    ).toBe(false);
    expect(
      genericDraftLineSchema.safeParse({
        type: 'GENERIC',
        description: 'Filtro',
        unitPrice: '118.00',
        costProvenance: 'UNKNOWN',
        acquisitionCostDop: '0.00',
      }).error?.issues[0]?.message,
    ).toBe(UNKNOWN_COST_AMOUNT_MESSAGE);
    expect(
      genericDraftLineSchema.safeParse({
        type: 'GENERIC',
        description: 'Filtro',
        unitPrice: '118.00',
        costProvenance: 'ACTUAL',
      }).error?.issues[0]?.message,
    ).toBe(COST_AMOUNT_REQUIRED_MESSAGE);
    expect(addInvoiceLineSchema.safeParse({ type: 'GENERIC', itemId: 'x' }).success).toBe(false);
    expect(setLinePriceSchema.safeParse({ unitPrice: '10', extra: true }).success).toBe(false);
  });

  it('rejects values that cannot be stored as DECIMAL(12,2)', () => {
    const line = {
      type: 'GENERIC' as const,
      description: 'Filtro',
      unitPrice: '118.00',
      costProvenance: 'UNKNOWN' as const,
    };

    expect(genericDraftLineSchema.safeParse({ ...line, quantity: '0.001' }).success).toBe(false);
    expect(genericDraftLineSchema.safeParse({ ...line, quantity: '0.00' }).success).toBe(false);
    expect(genericDraftLineSchema.safeParse({ ...line, unitPrice: '10000000000.00' }).success).toBe(
      false,
    );
    expect(setLinePriceSchema.safeParse({ unitPrice: '1e3' }).success).toBe(false);
    expect(setLinePriceSchema.safeParse({ unitPrice: '9999999999.99' }).success).toBe(true);
  });
});

describe('draft SERVICE line validation', () => {
  const serviceId = '11111111-1111-4111-8111-111111111111';

  it('accepts serviceId plus unitPrice, including zero, and optional description', () => {
    expect(
      serviceDraftLineSchema.parse({
        type: 'SERVICE',
        serviceId,
        unitPrice: '0.00',
      }),
    ).toEqual({
      type: 'SERVICE',
      serviceId,
      unitPrice: '0.00',
    });
    expect(
      serviceDraftLineSchema.parse({
        type: 'SERVICE',
        serviceId,
        unitPrice: '500.00',
        description: 'Instalación expres',
      }),
    ).toEqual({
      type: 'SERVICE',
      serviceId,
      unitPrice: '500.00',
      description: 'Instalación expres',
    });
  });

  it('rejects quantity, cost, numeric money, and extra fields', () => {
    expect(
      serviceDraftLineSchema.safeParse({
        type: 'SERVICE',
        serviceId,
        unitPrice: '100.00',
        quantity: '2',
      }).success,
    ).toBe(false);
    expect(
      serviceDraftLineSchema.safeParse({
        type: 'SERVICE',
        serviceId,
        unitPrice: '100.00',
        costProvenance: 'UNKNOWN',
      }).success,
    ).toBe(false);
    expect(
      serviceDraftLineSchema.safeParse({
        type: 'SERVICE',
        serviceId,
        unitPrice: 500,
      }).success,
    ).toBe(false);
    expect(
      serviceDraftLineSchema.safeParse({
        type: 'SERVICE',
        unitPrice: '100.00',
      }).success,
    ).toBe(false);
  });
});

describe('draft DELIVERY line validation', () => {
  it('accepts zero or positive unitPrice with a nonempty description', () => {
    expect(
      deliveryDraftLineSchema.parse({
        type: 'DELIVERY',
        unitPrice: '0.00',
        description: 'Entrega incluida',
      }),
    ).toEqual({
      type: 'DELIVERY',
      unitPrice: '0.00',
      description: 'Entrega incluida',
    });
    expect(
      deliveryDraftLineSchema.parse({
        type: 'DELIVERY',
        unitPrice: '200.00',
        description: 'Envío',
      }),
    ).toEqual({
      type: 'DELIVERY',
      unitPrice: '200.00',
      description: 'Envío',
    });
  });

  it('rejects missing or empty description, quantity, cost, numeric money, and extra fields', () => {
    expect(
      deliveryDraftLineSchema.safeParse({ type: 'DELIVERY', unitPrice: '10.00' }).success,
    ).toBe(false);
    expect(
      deliveryDraftLineSchema.safeParse({
        type: 'DELIVERY',
        unitPrice: '10.00',
        description: '   ',
      }).success,
    ).toBe(false);
    expect(
      deliveryDraftLineSchema.safeParse({
        type: 'DELIVERY',
        description: 'Envío',
        unitPrice: '10.00',
        quantity: '1',
      }).success,
    ).toBe(false);
    expect(
      deliveryDraftLineSchema.safeParse({
        type: 'DELIVERY',
        description: 'Envío',
        unitPrice: '10.00',
        costProvenance: 'UNKNOWN',
      }).success,
    ).toBe(false);
    expect(
      deliveryDraftLineSchema.safeParse({ type: 'DELIVERY', description: 'Envío', unitPrice: 0 })
        .success,
    ).toBe(false);
    expect(deliveryDraftLineSchema.safeParse({ type: 'DELIVERY' }).success).toBe(false);
    expect(addInvoiceLineSchema.safeParse({ type: 'DELIVERY', extra: true }).success).toBe(false);
  });
});
