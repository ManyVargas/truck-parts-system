import { randomUUID } from 'node:crypto';

import { expect } from 'vitest';
import type request from 'supertest';

export const TEST_CSRF_HEADERS = { 'X-Requested-With': 'XMLHttpRequest' };

/** Named customers may confirm unpaid (credit). Cliente contado may not. */
export async function assignNamedCustomerForCredit(
  agent: request.Agent,
  draftId: string,
): Promise<void> {
  const created = await agent.post('/api/customers').set(TEST_CSRF_HEADERS).send({
    name: `Cliente crédito ${randomUUID().slice(0, 8)}`,
  });
  expect(created.status).toBe(201);
  const patched = await agent
    .patch(`/api/sales/${draftId}`)
    .set(TEST_CSRF_HEADERS)
    .send({ customerId: created.body.id });
  expect(patched.status).toBe(200);
}

export function cashSaleFullPayment(amount: string) {
  return {
    payment: {
      amount,
      method: 'CASH' as const,
    },
  };
}
