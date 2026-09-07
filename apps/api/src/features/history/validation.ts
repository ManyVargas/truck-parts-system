import { z } from 'zod';

const role = z.enum(['ADMINISTRATOR', 'SELLER', 'MECHANIC']);
const actor = z.discriminatedUnion('actorType', [
  z.object({ actorType: z.literal('USER'), actorUserId: z.uuid() }).strict(),
  z.object({ actorType: z.literal('ANONYMOUS'), actorUserId: z.null() }).strict(),
  z.object({ actorType: z.literal('SYSTEM'), actorUserId: z.null() }).strict(),
]);
const profile = z
  .object({
    name: z.string(),
    username: z.string(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
  })
  .strict();
const base = { subjectType: z.literal('USER'), subjectId: z.uuid(), actor };
const recovery = { requestId: z.uuid(), before: z.literal('PENDING') };

export const historyEventSchema = z
  .discriminatedUnion('eventType', [
    z
      .object({
        ...base,
        eventType: z.literal('USER_CREATED'),
        payload: profile
          .extend({
            role,
            active: z.boolean(),
            mustChangePassword: z.boolean(),
            source: z.enum(['ADMINISTRATION', 'BOOTSTRAP_CLI']),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...base,
        eventType: z.literal('USER_ROLE_CHANGED'),
        payload: z.object({ before: role, after: role }).strict(),
      })
      .strict(),
    z
      .object({
        ...base,
        eventType: z.literal('USER_ACTIVATED'),
        payload: z.object({ before: z.literal(false), after: z.literal(true) }).strict(),
      })
      .strict(),
    z
      .object({
        ...base,
        eventType: z.literal('USER_DEACTIVATED'),
        payload: z.object({ before: z.literal(true), after: z.literal(false) }).strict(),
      })
      .strict(),
    z
      .object({
        ...base,
        eventType: z.literal('USER_PROFILE_CHANGED'),
        payload: z.object({ before: profile, after: profile }).strict(),
      })
      .strict(),
    z
      .object({
        ...base,
        eventType: z.literal('USER_PASSWORD_CHANGED'),
        payload: z
          .object({ wasChangeRequired: z.boolean(), mustChangePassword: z.literal(false) })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...base,
        eventType: z.literal('USER_RECOVERY_REQUESTED'),
        payload: z
          .object({ requestId: z.uuid(), expiresAt: z.iso.datetime(), after: z.literal('PENDING') })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...base,
        eventType: z.literal('USER_RECOVERY_APPROVED'),
        payload: z
          .object({
            ...recovery,
            after: z.literal('APPROVED'),
            identityVerified: z.literal(true),
            mustChangePassword: z.literal(true),
          })
          .strict(),
      })
      .strict(),
    z
      .object({
        ...base,
        eventType: z.literal('USER_RECOVERY_REJECTED'),
        payload: z.object({ ...recovery, after: z.literal('REJECTED') }).strict(),
      })
      .strict(),
    z
      .object({
        ...base,
        eventType: z.literal('USER_RECOVERY_EXPIRED'),
        payload: z.object({ ...recovery, after: z.literal('EXPIRED') }).strict(),
      })
      .strict(),
    z
      .object({
        ...base,
        eventType: z.literal('USER_RECOVERY_CANCELLED'),
        payload: z
          .object({
            ...recovery,
            after: z.literal('CANCELLED'),
            reason: z.enum(['USER_DEACTIVATED', 'PASSWORD_CHANGED']),
          })
          .strict(),
      })
      .strict(),
  ])
  .superRefine((event, context) => {
    const expected =
      event.eventType === 'USER_RECOVERY_REQUESTED'
        ? 'ANONYMOUS'
        : event.eventType === 'USER_RECOVERY_EXPIRED' ||
            (event.eventType === 'USER_CREATED' && event.payload.source === 'BOOTSTRAP_CLI')
          ? 'SYSTEM'
          : 'USER';
    if (event.actor.actorType !== expected)
      context.addIssue({ code: 'custom', message: 'Invalid actor for event', path: ['actor'] });
  });
