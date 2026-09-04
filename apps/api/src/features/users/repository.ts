import type { Prisma, User } from '@prisma/client';

import { prisma } from '../../infrastructure/database/index.js';
import type { CreateUserRecord, UpdateOwnProfileRecord } from './types.js';

type UserDatabase = Pick<Prisma.TransactionClient, 'user'>;

// Records contain passwordHash: internal service use only, never HTTP responses or logs.
// Pass the transaction client to keep all operations in the caller's transaction.
export class UserRepository {
  constructor(private readonly database: UserDatabase = prisma) {}

  create(input: CreateUserRecord): Promise<User> {
    return this.database.user.create({
      data: {
        name: input.name,
        username: input.username,
        phone: input.phone,
        email: input.email,
        role: input.role,
        passwordHash: input.passwordHash,
      },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.database.user.findUnique({ where: { id } });
  }

  // Callers normalize usernames with usernameSchema before querying.
  findByUsername(username: string): Promise<User | null> {
    return this.database.user.findUnique({ where: { username } });
  }

  async hasAnyUsers(): Promise<boolean> {
    // Inactive users also prevent the initial administrator bootstrap.
    return (await this.database.user.findFirst({ select: { id: true } })) !== null;
  }

  // Only persists state. Authorization and session revocation belong to services.
  setActive(id: string, active: boolean): Promise<User> {
    return this.database.user.update({ where: { id }, data: { active } });
  }

  // Never persist username, role or active from self-service profile edits.
  updateOwnProfile(id: string, input: UpdateOwnProfileRecord): Promise<User> {
    return this.database.user.update({
      where: { id },
      data: {
        name: input.name,
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.passwordHash !== undefined ? { passwordHash: input.passwordHash } : {}),
      },
    });
  }
}
