import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_CASH_CUSTOMER_ID } from '../../api/contracts/customers';
import { mockCustomerRepository } from '../repositories/MockCustomerRepository';
import { createInitialState } from '../data/seed';
import { setSession } from '../session';
import { resetMockState } from '../state';
import { buildCustomerDirectory, nextCustomerId, prepareCustomerSave } from './customers';

describe('buildCustomerDirectory', () => {
  it('matches seed invoice counts and puts Cliente Contado first', () => {
    const rows = buildCustomerDirectory(createInitialState());

    expect(rows.map((row) => ({ id: row.id, invoiceCount: row.invoiceCount }))).toEqual([
      { id: 'C0', invoiceCount: 1 },
      { id: 'C2', invoiceCount: 1 },
      { id: 'C1', invoiceCount: 3 },
    ]);
    expect(rows[0]?.isDefault).toBe(true);
    expect(rows[0]?.name).toBe('Cliente Contado');
  });

  it('searches by name or RNC without using other fields', () => {
    const state = createInitialState();

    expect(buildCustomerDirectory(state, 'caribe').map((row) => row.id)).toEqual(['C1']);
    expect(buildCustomerDirectory(state, '101-98765').map((row) => row.id)).toEqual(['C2']);
    expect(buildCustomerDirectory(state, '809-555-0200')).toEqual([]);
  });
});

describe('prepareCustomerSave', () => {
  const seedCustomers = createInitialState().customers;

  it('creates the next sequential id after C2', () => {
    expect(nextCustomerId(seedCustomers)).toBe('C3');

    const result = prepareCustomerSave(seedCustomers, {
      name: '  Taller Sur  ',
      phone: '809-555-0400',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toMatchObject({
        id: 'C3',
        name: 'Taller Sur',
        phone: '809-555-0400',
      });
      expect(result.value.isDefault).toBeUndefined();
    }
  });

  it('edits an ordinary customer without rewriting invoices', () => {
    const result = prepareCustomerSave(seedCustomers, {
      id: 'C1',
      name: 'Transportes del Caribe SRL',
      rnc: '131-45678-9',
      notes: 'Cuenta corporativa',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.notes).toBe('Cuenta corporativa');
    }
  });

  it('rejects edits to Cliente Contado', () => {
    const result = prepareCustomerSave(seedCustomers, {
      id: DEFAULT_CASH_CUSTOMER_ID,
      name: 'Otro nombre',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
    }
  });

  it('rejects empty name and invalid email', () => {
    expect(prepareCustomerSave(seedCustomers, { name: '   ' }).ok).toBe(false);
    expect(prepareCustomerSave(seedCustomers, { name: 'A', email: 'no-es-correo' }).ok).toBe(false);
  });
});

describe('MockCustomerRepository', () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  it('persists a create in mock session state', async () => {
    setSession({ userId: 'U-LAURA', createdAt: '2026-08-25T16:00:00.000Z' });

    const saved = await mockCustomerRepository.save({ name: 'Flota Este' });
    expect(saved.ok).toBe(true);

    const listed = await mockCustomerRepository.list();
    expect(listed.ok).toBe(true);
    if (listed.ok) {
      expect(listed.value.some((row) => row.name === 'Flota Este' && row.id === 'C3')).toBe(true);
    }
  });

  it('denies mechanic access', async () => {
    setSession({ userId: 'U-PEDRO', createdAt: '2026-08-25T16:00:00.000Z' });

    const result = await mockCustomerRepository.list();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
    }
  });
});
