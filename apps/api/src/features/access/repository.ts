import type { Prisma, Session } from '@prisma/client';

import { prisma } from '../../infrastructure/database/index.js';
import type { CreateSessionRecord } from './types.js';

type SessionDatabase = Pick<Prisma.TransactionClient, 'session'>;

// Internal records only; never expose or log session hashes.
export class SessionRepository {
  constructor(private readonly database: SessionDatabase = prisma) {}

  create(input: CreateSessionRecord): Promise<Session> {
    return this.database.session.create({
      data: {
        tokenHash: input.tokenHash,
        userId: input.userId,
        expiresAt: input.expiresAt,
      },
    });
  }

  // Persistence lookup only. The access service must check expiry and active user.
  findByTokenHash(tokenHash: string): Promise<Session | null> {
    return this.database.session.findUnique({ where: { tokenHash } });
  }

  async revokeByTokenHash(tokenHash: string): Promise<number> {
    // deleteMany makes repeated logout/revocation safe when the session is already gone.
    const result = await this.database.session.deleteMany({ where: { tokenHash } });
    return result.count;
  }

  async revokeAllByUserId(userId: string): Promise<number> {
    const result = await this.database.session.deleteMany({ where: { userId } });
    return result.count;
  }
}
