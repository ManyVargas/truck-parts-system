import { AppError } from '../../infrastructure/errors/app-error.js';
import { UserRepository } from '../users/repository.js';
import { usernameSchema } from '../users/validation.js';
import { accountTransaction, type AccountTransaction } from '../users/transaction.js';
import { INVALID_CREDENTIALS_MESSAGE, SESSION_TTL_MS } from './constants.js';
import { hashPassword, verifyPassword } from './password.js';
import { SessionRepository } from './repository.js';
import type { AuthUserRecord, LoginResult, RequestAuth } from './types.js';
import { generateSessionToken, hashSessionToken } from './session-token.js';
import { loginBodySchema, updateOwnProfileBodySchema } from './validation.js';

let dummyPasswordHashPromise: Promise<string> | undefined;

function dummyPasswordHash(): Promise<string> {
  dummyPasswordHashPromise ??= hashPassword('not-a-real-account-password');
  return dummyPasswordHashPromise;
}

export function toRequestAuth(user: AuthUserRecord): RequestAuth {
  return {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    phone: user.phone,
    email: user.email,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class AccessService {
  constructor(
    private readonly users: UserRepository = new UserRepository(),
    private readonly sessions: SessionRepository = new SessionRepository(),
    private readonly now: () => Date = () => new Date(),
    private readonly transaction: AccountTransaction = accountTransaction,
  ) {}

  async login(input: unknown, previousSessionToken?: string): Promise<LoginResult> {
    const credentials = loginBodySchema.parse(input);
    const username = usernameSchema.parse(credentials.username);
    const user = await this.users.findByUsername(username);

    if (!user) {
      await verifyPassword(await dummyPasswordHash(), credentials.password);
      throw AppError.unauthorized(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await verifyPassword(user.passwordHash, credentials.password);
    if (!passwordMatches || !user.active) {
      throw AppError.unauthorized(INVALID_CREDENTIALS_MESSAGE);
    }

    return this.transaction(async ({ users, sessions }) => {
      // Serialize session issuance with password resets and deactivation.
      const current = await users.findById(user.id);
      if (!current?.active || current.passwordHash !== user.passwordHash) {
        throw AppError.unauthorized(INVALID_CREDENTIALS_MESSAGE);
      }
      const session = await this.rotateSession(user.id, previousSessionToken, sessions);
      return { user: current, ...session };
    });
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) {
      return;
    }

    await this.sessions.revokeByTokenHash(hashSessionToken(rawToken));
  }

  async resolveSession(rawToken: string): Promise<AuthUserRecord> {
    const session = await this.sessions.findByTokenHash(hashSessionToken(rawToken));
    if (!session || session.expiresAt.getTime() <= this.now().getTime()) {
      throw AppError.unauthorized();
    }

    const user = await this.users.findById(session.userId);
    if (!user || !user.active) {
      await this.sessions.revokeByTokenHash(session.tokenHash);
      throw AppError.unauthorized();
    }

    return user;
  }

  async updateOwnProfile(userId: string, input: unknown): Promise<AuthUserRecord> {
    const profile = updateOwnProfileBodySchema.parse(input);
    const user = await this.users.findById(userId);
    if (!user || !user.active) {
      throw AppError.unauthorized();
    }

    let passwordHash: string | undefined;
    if (profile.password !== undefined) {
      const currentPassword = profile.currentPassword ?? '';
      const currentMatches = await verifyPassword(user.passwordHash, currentPassword);
      if (!currentMatches) {
        throw AppError.validation('Current password is incorrect');
      }
      if (profile.password === currentPassword) {
        throw AppError.validation('New password must differ from current password');
      }
      passwordHash = await hashPassword(profile.password);
    }

    return this.transaction(async ({ users, sessions, recoveries }) => {
      const current = await users.findById(userId);
      if (!current?.active) throw AppError.unauthorized();
      if (current.passwordHash !== user.passwordHash) {
        throw AppError.conflict('Credentials changed; sign in again');
      }
      const updated = await users.updateOwnProfile(userId, {
        name: profile.name,
        phone: profile.phone,
        email: profile.email,
        passwordHash,
        ...(passwordHash ? { mustChangePassword: false } : {}),
      });
      if (passwordHash) {
        await sessions.revokeAllByUserId(userId);
        await recoveries.cancelForUser(userId, this.now());
      }
      return updated;
    });
  }

  private async rotateSession(
    userId: string,
    previousSessionToken?: string,
    sessions: SessionRepository = this.sessions,
  ): Promise<{ sessionToken: string; expiresAt: Date }> {
    if (previousSessionToken) {
      await sessions.revokeByTokenHash(hashSessionToken(previousSessionToken));
    }

    const sessionToken = generateSessionToken();
    const expiresAt = new Date(this.now().getTime() + SESSION_TTL_MS);
    await sessions.create({
      tokenHash: hashSessionToken(sessionToken),
      userId,
      expiresAt,
    });

    return { sessionToken, expiresAt };
  }
}

export const accessService = new AccessService();
