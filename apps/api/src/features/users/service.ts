import { randomBytes } from 'node:crypto';

import { AppError } from '../../infrastructure/errors/app-error.js';
import { hashPassword } from '../access/password.js';
import { toPublicProfile } from '../access/projection.js';
import { assertAdministrator } from './policies.js';
import { accountTransaction, type AccountTransaction } from './transaction.js';
import {
  createAdministrativeUserSchema,
  paginationSchema,
  recoveryRequestSchema,
  recoveryResolutionSchema,
  updateAdministrativeUserSchema,
  userIdSchema,
} from './validation.js';

export const INITIAL_PASSWORD = 'solocamiones';
export const RECOVERY_REQUEST_TTL_MS = 24 * 60 * 60 * 1000;
export const RECOVERY_REQUEST_MESSAGE =
  'If the account is eligible, its recovery request will be available to an administrator.';

export class UserService {
  constructor(
    private readonly transaction: AccountTransaction = accountTransaction,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async create(actorId: string, input: unknown) {
    const profile = createAdministrativeUserSchema.parse(input);
    const passwordHash = await hashPassword(INITIAL_PASSWORD);
    return this.transaction(async ({ users }) => {
      assertAdministrator(await users.findById(actorId));
      return toPublicProfile(
        await users.create({ ...profile, passwordHash, mustChangePassword: true }),
      );
    });
  }

  async list(actorId: string, query: unknown) {
    const { page, pageSize } = paginationSchema.parse(query);
    return this.transaction(async ({ users }) => {
      assertAdministrator(await users.findById(actorId));
      const result = await users.list(page, pageSize);
      return { ...result, items: result.items.map(toPublicProfile) };
    });
  }

  async update(actorId: string, id: string, input: unknown) {
    userIdSchema.parse({ id });
    const patch = updateAdministrativeUserSchema.parse(input);
    return this.transaction(async ({ users, sessions, recoveries }) => {
      assertAdministrator(await users.findById(actorId));
      const target = await users.findById(id);
      if (!target) throw AppError.notFound('User not found');
      const removesAdministrator =
        patch.active === false || (patch.role !== undefined && patch.role !== 'ADMINISTRATOR');
      if (id === actorId && removesAdministrator) {
        throw AppError.forbidden('Another administrator must deactivate or change your role');
      }
      if (
        target.active &&
        target.role === 'ADMINISTRATOR' &&
        removesAdministrator &&
        (await users.countActiveAdministrators()) <= 1
      ) {
        throw AppError.conflict('At least one active administrator is required');
      }
      const updated = await users.updateAdministrative(id, patch);
      if (patch.active === false) {
        await sessions.revokeAllByUserId(id);
        await recoveries.cancelForUser(id, this.now());
      }
      return toPublicProfile(updated);
    });
  }

  async requestRecovery(input: unknown): Promise<{ message: string }> {
    const { username } = recoveryRequestSchema.parse(input);
    try {
      await this.transaction(async ({ users, recoveries }) => {
        const user = await users.findByUsername(username);
        if (!user?.active) return;
        const now = this.now();
        await recoveries.expire(now, user.id);
        if (!(await recoveries.findPending(user.id))) {
          await recoveries.create(user.id, new Date(now.getTime() + RECOVERY_REQUEST_TTL_MS));
        }
      });
    } catch (error) {
      // A simultaneous duplicate is indistinguishable from an existing request to public callers.
      if (!(error instanceof AppError && error.code === 'CONFLICT')) throw error;
    }
    return { message: RECOVERY_REQUEST_MESSAGE };
  }

  async listRecoveries(actorId: string, query: unknown) {
    const { page, pageSize } = paginationSchema.parse(query);
    return this.transaction(async ({ users, recoveries }) => {
      assertAdministrator(await users.findById(actorId));
      await recoveries.expire(this.now());
      return recoveries.list(page, pageSize);
    });
  }

  async resolveRecovery(actorId: string, id: string, input: unknown) {
    userIdSchema.parse({ id });
    const resolution = recoveryResolutionSchema.parse(input);
    // 192 random bits, no expiration. Plaintext exists only for this one response.
    const temporaryPassword =
      resolution.action === 'approve' ? randomBytes(24).toString('base64url') : undefined;
    const passwordHash = temporaryPassword ? await hashPassword(temporaryPassword) : undefined;
    return this.transaction(async ({ users, sessions, recoveries }) => {
      assertAdministrator(await users.findById(actorId));
      const recovery = await recoveries.findById(id);
      if (!recovery) throw AppError.notFound('Recovery request not found');
      if (recovery.userId === actorId)
        throw AppError.forbidden('Cannot resolve your own recovery request');
      const now = this.now();
      if (recovery.status !== 'PENDING' || recovery.expiresAt <= now) {
        throw AppError.conflict('Recovery request is no longer pending or has expired');
      }
      const user = await users.findById(recovery.userId);
      if (!user?.active) throw AppError.conflict('Recovery cannot reactivate an inactive account');
      if (passwordHash) {
        await users.updateOwnProfile(user.id, {
          name: user.name,
          passwordHash,
          mustChangePassword: true,
        });
        await sessions.revokeAllByUserId(user.id);
      }
      const result = await recoveries.resolve(
        id,
        resolution.action === 'approve' ? 'APPROVED' : 'REJECTED',
        actorId,
        now,
        resolution.action === 'approve',
      );
      return { request: result, ...(temporaryPassword ? { temporaryPassword } : {}) };
    });
  }
}

export const userService = new UserService();
