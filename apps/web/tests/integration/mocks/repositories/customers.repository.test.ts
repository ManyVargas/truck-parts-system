import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mockCustomerRepository } from '../../../../src/mocks/repositories/MockCustomerRepository';
import { resetMockState } from '../../../../src/mocks/state';
import { signInAs } from '../../../support/session';

describe('MockCustomerRepository', () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  it('persists a create and returns it from the directory', async () => {
    signInAs('SELLER');

    const saved = await mockCustomerRepository.save({ name: 'Flota Este' });
    const listed = await mockCustomerRepository.list();

    expect(saved.ok).toBe(true);
    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.value).toContainEqual(
        expect.objectContaining({ id: 'C3', name: 'Flota Este' }),
      );
    }
  });

  it('persists edits without changing the customer identity', async () => {
    signInAs('ADMINISTRATOR');

    const saved = await mockCustomerRepository.save({
      id: 'C1',
      name: 'Transportes del Caribe SRL',
      notes: 'Crédito aprobado',
    });
    const loaded = await mockCustomerRepository.getById('C1');

    expect(saved.ok).toBe(true);
    expect(loaded.ok && loaded.value.notes).toBe('Crédito aprobado');
  });

  it('returns NOT_FOUND for an unknown customer', async () => {
    signInAs('SELLER');

    const result = await mockCustomerRepository.getById('C404');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('denies mechanic access', async () => {
    signInAs('MECHANIC');

    const result = await mockCustomerRepository.list();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });

  it('returns defensive copies from read operations', async () => {
    signInAs('SELLER');

    const first = await mockCustomerRepository.getById('C1');
    expect(first.ok).toBe(true);
    if (first.ok) {
      first.value.name = 'Mutación externa';
    }
    const second = await mockCustomerRepository.getById('C1');

    expect(second.ok && second.value.name).toBe('Transportes del Caribe SRL');
  });
});
