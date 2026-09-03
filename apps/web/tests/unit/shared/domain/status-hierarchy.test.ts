import { describe, expect, it } from 'vitest';

import {
  assemblyKindLabel,
  commercialAvailabilityLabel,
  commercialAvailabilityLayer,
  isIncompleteException,
  physicalRelationLabel,
} from '../../../../src/shared/domain/status-hierarchy';

describe('status-hierarchy', () => {
  it('treats commercial availability as the primary label and sold or empty stock as exceptions', () => {
    expect(commercialAvailabilityLabel('AVAILABLE')).toBe('Disponible');
    expect(commercialAvailabilityLayer('AVAILABLE')).toBe('primary');
    expect(commercialAvailabilityLabel('SOLD')).toBe('Vendido');
    expect(commercialAvailabilityLayer('SOLD')).toBe('exception');
    expect(commercialAvailabilityLabel('UNAVAILABLE')).toBe('No disponible');
    expect(commercialAvailabilityLayer('UNAVAILABLE')).toBe('exception');
  });

  it('renders installed parent as context and independent as the aligned physical slot', () => {
    expect(physicalRelationLabel('INSTALLED', 'Motor Detroit DD15')).toBe(
      'Instalado en Motor Detroit DD15',
    );
    expect(physicalRelationLabel('INDEPENDENT')).toBe('Independiente');
    expect(physicalRelationLabel()).toBe('Por cantidad');
  });

  it('surfaces only incomplete as an exception and assembly as optional context', () => {
    expect(isIncompleteException(false)).toBe(true);
    expect(isIncompleteException(true)).toBe(false);
    expect(isIncompleteException(undefined)).toBe(false);
    expect(assemblyKindLabel(true)).toBe('Ensamblaje');
    expect(assemblyKindLabel(false)).toBeNull();
  });
});
