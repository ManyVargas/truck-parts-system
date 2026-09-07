import type { User } from '@prisma/client';
import type { HistoryRepository } from './repository.js';
import type { HistoryActor } from './types.js';

export function profileSnapshot(user: Pick<User, 'name' | 'username' | 'phone' | 'email'>) {
  return { name: user.name, username: user.username, phone: user.phone, email: user.email };
}

export async function appendRecoveryExpirations(
  history: HistoryRepository,
  requests: { id: string; userId: string }[],
) {
  for (const request of requests) {
    await history.append({
      actor: { actorType: 'SYSTEM', actorUserId: null },
      subjectType: 'USER',
      subjectId: request.userId,
      eventType: 'USER_RECOVERY_EXPIRED',
      payload: { requestId: request.id, before: 'PENDING', after: 'EXPIRED' },
    });
  }
}

export async function appendRecoveryCancellations(
  history: HistoryRepository,
  requests: { id: string; userId: string }[],
  actor: HistoryActor,
  reason: 'USER_DEACTIVATED' | 'PASSWORD_CHANGED',
) {
  for (const request of requests) {
    await history.append({
      actor,
      subjectType: 'USER',
      subjectId: request.userId,
      eventType: 'USER_RECOVERY_CANCELLED',
      payload: { requestId: request.id, before: 'PENDING', after: 'CANCELLED', reason },
    });
  }
}

export async function appendProfileChange(
  history: HistoryRepository,
  actorId: string,
  before: User,
  after: User,
) {
  const previous = profileSnapshot(before);
  const next = profileSnapshot(after);
  if (
    Object.keys(previous).some(
      (key) => previous[key as keyof typeof previous] !== next[key as keyof typeof next],
    )
  ) {
    await history.append({
      actor: { actorType: 'USER', actorUserId: actorId },
      subjectType: 'USER',
      subjectId: after.id,
      eventType: 'USER_PROFILE_CHANGED',
      payload: { before: previous, after: next },
    });
  }
}
