import type { AppEvent, HistoryEventView, User } from '../../api/contracts/entities';

/**
 * Resolves a stored actor id to a display name.
 * Deactivated users stay in the user list so prior events still name them (AUTH-004 / HIST-002).
 * If the id is missing from the directory, the raw id is shown rather than dropping attribution.
 */
export function resolveActorName(users: User[], actorId?: string): string | undefined {
  if (!actorId) {
    return undefined;
  }

  return users.find((user) => user.id === actorId)?.name ?? actorId;
}

export function toHistoryEventView(event: AppEvent, users: User[]): HistoryEventView {
  return {
    id: event.id,
    type: event.type,
    description: event.description,
    createdAt: event.createdAt,
    actorName: resolveActorName(users, event.actorId),
  };
}
