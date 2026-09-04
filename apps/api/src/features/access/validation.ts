import { z } from 'zod';

import { emailSchema, nameSchema, phoneSchema, usernameSchema } from '../users/validation.js';
import { passwordSchema } from './password-policy.js';

export { passwordSchema };

export const loginBodySchema = z.strictObject({
  username: usernameSchema,
  // Do not apply creation length rules here; failed logins must stay generic.
  password: z.string(),
});

export const updateOwnProfileBodySchema = z
  .strictObject({
    name: nameSchema,
    phone: phoneSchema,
    email: emailSchema,
    currentPassword: z.string().optional(),
    password: passwordSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.password !== undefined && value.currentPassword === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['currentPassword'],
        message: 'Current password is required to change password',
      });
    }

    if (value.currentPassword !== undefined && value.password === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'New password is required when current password is provided',
      });
    }
  });
