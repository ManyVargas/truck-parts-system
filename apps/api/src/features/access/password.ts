import { argon2id, hash, verify } from 'argon2';

import { AppError } from '../../infrastructure/errors/app-error.js';
import { passwordSchema } from './validation.js';

export async function hashPassword(password: string): Promise<string> {
  const validatedPassword = passwordSchema.parse(password);
  try {
    // Memory is in KiB. Argon2 generates a fresh random salt for each hash.
    return await hash(validatedPassword, {
      type: argon2id,
      memoryCost: 19 * 1024,
      timeCost: 2,
      parallelism: 1,
    });
  } catch {
    // Native errors must not expose credentials through logs or error responses.
    throw AppError.internal('Password hashing failed');
  }
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  // Verification compares the exact input, without applying creation policies.
  try {
    return await verify(passwordHash, password);
  } catch {
    // A corrupt stored hash is an internal failure, not an incorrect password.
    throw AppError.internal('Password verification failed');
  }
}
