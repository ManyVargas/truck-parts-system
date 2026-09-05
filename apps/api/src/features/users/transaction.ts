import { Prisma } from '@prisma/client';

import { prisma } from '../../infrastructure/database/index.js';
import { AppError } from '../../infrastructure/errors/app-error.js';
import { SessionRepository } from '../access/repository.js';
import { UserRepository } from './repository.js';
import { RecoveryRepository } from './recovery-repository.js';

export type AccountRepositories = {
  users: UserRepository;
  sessions: SessionRepository;
  recoveries: RecoveryRepository;
};
export type AccountTransaction = <T>(
  work: (repositories: AccountRepositories) => Promise<T>,
) => Promise<T>;

// Retry the whole rule evaluation, never just the final write. No external effects inside work.
export const accountTransaction: AccountTransaction = async (work) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) =>
          work({
            users: new UserRepository(tx),
            sessions: new SessionRepository(tx),
            recoveries: new RecoveryRepository(tx),
          }),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2034' && attempt < 3) continue;
        if (error.code === 'P2002')
          throw AppError.conflict('Unique account or pending request already exists');
        if (error.code === 'P2025') throw AppError.notFound();
        if (error.code === 'P2034')
          throw AppError.conflict('Concurrent account change; retry the request');
      }
      throw error;
    }
  }
};
