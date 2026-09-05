import type { Prisma, RecoveryStatus } from '@prisma/client';

import { prisma } from '../../infrastructure/database/index.js';

export class RecoveryRepository {
  constructor(
    private readonly database: Pick<Prisma.TransactionClient, 'passwordRecoveryRequest'> = prisma,
  ) {}

  expire(now: Date, userId?: string) {
    return this.database.passwordRecoveryRequest.updateMany({
      where: { status: 'PENDING', expiresAt: { lte: now }, ...(userId ? { userId } : {}) },
      data: { status: 'EXPIRED', resolvedAt: now },
    });
  }

  findPending(userId: string) {
    return this.database.passwordRecoveryRequest.findFirst({
      where: { userId, status: 'PENDING' },
    });
  }

  create(userId: string, expiresAt: Date) {
    return this.database.passwordRecoveryRequest.create({ data: { userId, expiresAt } });
  }

  findById(id: string) {
    return this.database.passwordRecoveryRequest.findUnique({ where: { id } });
  }

  async list(page: number, pageSize: number) {
    const where = { status: 'PENDING' as const };
    const items = await this.database.passwordRecoveryRequest.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: {
        user: { select: { id: true, username: true, name: true, active: true, role: true } },
      },
    });
    return {
      items,
      total: await this.database.passwordRecoveryRequest.count({ where }),
      page,
      pageSize,
    };
  }

  resolve(
    id: string,
    status: RecoveryStatus,
    resolvedById: string,
    now: Date,
    identityVerified: boolean,
  ) {
    return this.database.passwordRecoveryRequest.update({
      where: { id },
      data: { status, resolvedById, resolvedAt: now, identityVerified },
    });
  }

  cancelForUser(userId: string, now: Date) {
    return this.database.passwordRecoveryRequest.updateMany({
      where: { userId, status: 'PENDING' },
      data: { status: 'CANCELLED', resolvedAt: now },
    });
  }
}
