import type { AuthUserRecord, PublicAuthUser, PublicProfile } from './types.js';

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
