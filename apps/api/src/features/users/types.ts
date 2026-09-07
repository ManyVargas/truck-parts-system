import type { z } from 'zod';

import type { createUserSchema } from './validation.js';

// Validated service input; contains a password and must never be logged or returned.
export type CreateUserInput = z.output<typeof createUserSchema>;

// Persistence accepts a hash only. Validation and hashing belong to the service.
export type CreateUserRecord = Omit<CreateUserInput, 'password'> & {
  passwordHash: string;
  mustChangePassword?: boolean;
};

// Own-profile persistence only. Username, role and active stay out of this type.
export type UpdateOwnProfileRecord = {
  name: string;
  phone?: string | null;
  email?: string | null;
  passwordHash?: string;
  mustChangePassword?: boolean;
};
