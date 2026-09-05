import { describe, expect, it } from 'vitest';
import { historyEventSchema } from '../../../src/features/history/validation.js';

const id = '11111111-1111-4111-8111-111111111111';
const event = {
  actor: { actorType: 'USER', actorUserId: id },
  subjectType: 'USER',
  subjectId: id,
  eventType: 'USER_PASSWORD_CHANGED',
  payload: { wasChangeRequired: true, mustChangePassword: false },
};

describe('history validation boundary', () => {
  it('accepts a password event containing only restriction metadata', () => {
    expect(historyEventSchema.parse(event)).toEqual(event);
  });
  it.each([
    'password',
    'passwordHash',
    'currentPassword',
    'temporaryPassword',
    'tokenHash',
    'sessionToken',
  ])('rejects %s instead of silently persisting or stripping it', (key) => {
    expect(
      historyEventSchema.safeParse({ ...event, payload: { ...event.payload, [key]: 'secret' } })
        .success,
    ).toBe(false);
    expect(historyEventSchema.safeParse({ ...event, [key]: 'secret' }).success).toBe(false);
  });
  it('rejects mismatched actors, subjects and event categories', () => {
    for (const patch of [
      { actor: { actorType: 'USER', actorUserId: null } },
      { actor: { actorType: 'SYSTEM', actorUserId: id } },
      { actor: { actorType: 'ANONYMOUS', actorUserId: null } },
      { subjectType: 'INVOICE' },
      { eventType: 'UNKNOWN' },
      { subjectId: 'invalid' },
    ])
      expect(historyEventSchema.safeParse({ ...event, ...patch }).success).toBe(false);
  });
  it('rejects credentials hidden inside a before/after profile', () => {
    const profile = { name: 'A', username: 'a', phone: null, email: null };
    expect(
      historyEventSchema.safeParse({
        ...event,
        eventType: 'USER_PROFILE_CHANGED',
        payload: {
          before: profile,
          after: { ...profile, passwordHash: 'secret' },
        },
      }).success,
    ).toBe(false);
  });
});
