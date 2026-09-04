import type { Role } from '@prisma/client';

// Internal persistence input. Token generation and hashing belong to the access service.
export type CreateSessionRecord = {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
};

export type PublicAuthUser = {
  id: string;
  username: string;
  name: string;
  role: Role;
};

/** Seller/Administrator session payload: identity plus own contact. Never commercial/financial fields. */
export type PublicSessionUser = PublicAuthUser & {
  phone: string | null;
  email: string | null;
};

/**
 * Mechanic sessions stay at identity only (AUTH-002 R1). Work Order commercial stripping belongs
 * to the Work Orders release (WO-003), not this DTO.
 */
export type SessionProjection = PublicAuthUser | PublicSessionUser;

export type PublicProfile = PublicAuthUser & {
  phone: string | null;
  email: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuthUserRecord = {
  id: string;
  username: string;
  name: string;
  role: Role;
  phone: string | null;
  email: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  passwordHash: string;
};

export type LoginResult = {
  user: AuthUserRecord;
  sessionToken: string;
  expiresAt: Date;
};

export type RequestAuth = {
  userId: string;
  username: string;
  name: string;
  role: Role;
  phone: string | null;
  email: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};
