import { describe, expect, it } from 'vitest';

import { createDraftSchema, updateDraftMetaSchema } from '../../../src/features/sales/validation.js';

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
