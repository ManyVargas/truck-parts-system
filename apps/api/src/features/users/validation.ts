import { Role } from '@prisma/client';
import { z } from 'zod';

import { passwordSchema } from '../access/password-policy.js';

export const usernameSchema = z.string().trim().toLowerCase().min(1, 'Username is required');
export const nameSchema = z.string().trim().min(1, 'Name is required');
export const roleSchema = z.enum(Role);

// Preserve omitted values; represent explicitly blank optional contact fields as null.
function normalizeContact(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.trim() || null;
}

export const phoneSchema = z.preprocess(normalizeContact, z.string().nullable().optional());
export const emailSchema = z.preprocess(normalizeContact, z.email().nullable().optional());

// Shared creation input for future services; database fields are never client input.
export const createUserSchema = z.strictObject({
  name: nameSchema,
  username: usernameSchema,
  phone: phoneSchema,
  email: emailSchema,
  role: roleSchema,
  password: passwordSchema,
});
