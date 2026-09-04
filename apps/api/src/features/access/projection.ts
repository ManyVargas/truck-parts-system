import type {
  AuthUserRecord,
  PublicAuthUser,
  PublicProfile,
  SessionProjection,
} from './types.js';

export function toPublicAuthUser(
  user: Pick<AuthUserRecord, 'id' | 'username' | 'name' | 'role'>,
): PublicAuthUser {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  };
}

/** Role-aware GET /session body. Own contact is not commercial data; Mechanic still omits it here. */
export function toSessionProjection(
  user: Pick<AuthUserRecord, 'id' | 'username' | 'name' | 'role' | 'phone' | 'email'>,
): SessionProjection {
  const identity = toPublicAuthUser(user);
  if (user.role === 'MECHANIC') {
    return identity;
  }

  return {
    ...identity,
    phone: user.phone,
    email: user.email,
  };
}

export function toPublicProfile(user: Omit<AuthUserRecord, 'passwordHash'>): PublicProfile {
  return {
    ...toPublicAuthUser(user),
    phone: user.phone,
    email: user.email,
    active: user.active,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
