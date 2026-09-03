import { describe, expect, it } from 'vitest';

import { CAPABILITY_PRESETS } from '../../../../src/shared/config/capabilities';
import {
  posAddLineReservationHint,
  posDraftDescription,
  toPosUserMessage,
} from '../../../../src/features/sales/pos-copy';

describe('pos-copy', () => {
  it('does not mention inventory reservation in Release 2 billing', () => {
    expect(posDraftDescription(CAPABILITY_PRESETS['release-2'])).not.toMatch(/reserv/i);
    expect(posDraftDescription(CAPABILITY_PRESETS['release-5'])).toMatch(/reservadas/);
  });

  it('explains reservation only for inventory-backed line types', () => {
    expect(posAddLineReservationHint('GENERIC')).toBeNull();
    expect(posAddLineReservationHint('ITEM')).toMatch(/reservada/);
    expect(posAddLineReservationHint('QTY')).toMatch(/reservadas/);
  });

  it('turns stock conflicts into seller actions instead of HTTP status codes', () => {
    expect(
      toPosUserMessage({ code: 'CONFLICT', message: 'ALT-004 ya está vendido' }),
    ).toBe('La pieza ALT-004 ya no está disponible. Elimínala del borrador o selecciona otra.');
    expect(
      toPosUserMessage({ code: 'CONFLICT', message: 'HTTP 409: /api/sales/INV-DRAFT-01/confirm' }),
    ).toBe('La pieza ya no está disponible. Elimínala del borrador o selecciona otra.');
    expect(
      toPosUserMessage({ code: 'CONFLICT', message: 'Stock insuficiente para QTY-OIL' }),
    ).toBe('Esa cantidad de QTY-OIL ya no está disponible. Ajusta la línea o elige otro producto.');
  });
});
