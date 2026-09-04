import { Prisma } from '@prisma/client';

import { prisma } from '../../infrastructure/database/index.js';
import { AppError } from '../../infrastructure/errors/app-error.js';
import { hashPassword } from '../access/password.js';
import { UserRepository } from './repository.js';
import { createUserSchema } from './validation.js';

export const bootstrapAdminSchema = createUserSchema.omit({ role: true });

export type BootstrapAdminResult = { id: string; username: string };

export async function bootstrapAdministrator(input: unknown): Promise<BootstrapAdminResult> {
  const { password, ...profile } = bootstrapAdminSchema.parse(input);
  // Perform the expensive hash outside the short database transaction.
  const passwordHash = await hashPassword(password);

  try {
    return await prisma.$transaction(
      async (transaction) => {
        const users = new UserRepository(transaction);
        if (await users.hasAnyUsers()) {
          throw AppError.conflict(
            'El bootstrap requiere una base sin usuarios, incluidos inactivos.',
          );
        }
        const user = await users.create({ ...profile, passwordHash, role: 'ADMINISTRATOR' });
        return { id: user.id, username: user.username };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2034' || error.code === 'P2002')
    ) {
      // Another bootstrap can win even with a different username. Never retry as an upsert.
      throw AppError.conflict(
        'Conflicto concurrente: no se creó el administrador en esta ejecución.',
      );
    }
    throw error;
  }
}
