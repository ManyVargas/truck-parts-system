import type { Role } from '../../src/api/contracts/entities';
import { setSession } from '../../src/mocks/session';

const USER_ID_BY_ROLE: Record<Role, string> = {
  ADMINISTRATOR: 'U-ADMIN',
  SELLER: 'U-LAURA',
  MECHANIC: 'U-PEDRO',
};

export function signInAs(role: Role): void {
  setSession({
    userId: USER_ID_BY_ROLE[role],
    createdAt: '2026-08-25T16:00:00.000Z',
  });
}
