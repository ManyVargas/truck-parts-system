import type { Role, Session, User } from './entities';

/** Public HTTP identity; the session credential exists only in the HttpOnly cookie. */
export type AuthIdentity = {
  id: string;
  username: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
};

export type SessionProjection = AuthIdentity & {
  phone?: string | null;
  email?: string | null;
};

/** The legacy session remains confined to the prototype adapter. */
export type AuthSession = Session | SessionProjection;
export type PublicUser = Omit<User, 'password'> & { mustChangePassword?: boolean };
export type PublicProfileResponse = AuthIdentity & {
  active: boolean;
  phone: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
};
