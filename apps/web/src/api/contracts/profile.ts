import type { PublicUser } from './auth';

/**
 * Self-service profile payload. Intentionally omits id, username, role, and active
 * so clients cannot mass-assign administrator-managed fields.
 */
export type UpdateOwnProfileInput = {
  name: string;
  phone?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export type UpdateOwnProfileResult = PublicUser;
