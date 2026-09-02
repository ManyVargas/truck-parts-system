import {
  ABANDONED_DRAFT_AFTER_HOURS,
  type ReleaseReservationInput,
} from '../../api/contracts/recovery';
import type { AppEvent, AppState, User } from '../../api/contracts/entities';
import { err, ok, type Result } from '../../shared/auth/types';
import { can } from '../../shared/auth/policies';
import { DEMO_NOW_ISO } from '../data/demo-clock';
import { discardDraft } from './sales-pos-commands';
import { isAbandonedDraft } from './recovery-eligibility';

function nextNumericId(ids: string[], prefix: string, pad: number): string {
  let max = 0;
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`);

  for (const id of ids) {
    const match = pattern.exec(id);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }

  return `${prefix}${String(max + 1).padStart(pad, '0')}`;
}

function appendEvent(
  state: AppState,
  type: string,
  description: string,
  actor: User,
  metadata?: Record<string, unknown>,
): AppEvent {
  const event: AppEvent = {
    id: nextNumericId(
      state.events.map((entry) => entry.id),
      'EV-',
      3,
    ),
    type,
    description,
    actorId: actor.id,
    createdAt: DEMO_NOW_ISO,
    metadata,
  };
  state.events.push(event);
  return event;
}

/**
 * ADMIN-002: named release of an abandoned Draft reservation.
 * Reuses discard (releases holds and removes the draft) and appends an audited recovery event.
 */
export function releaseAbandonedReservation(
  state: AppState,
  actor: User,
  input: ReleaseReservationInput,
): Result<{ draftId: string; releasedItemIds: string[] }> {
  if (!can(actor, 'recovery.manage')) {
    return err({ code: 'FORBIDDEN', message: 'No tiene permiso para realizar esta acción' });
  }

  const reason = input.reason.trim();
  if (!reason) {
    return err({ code: 'VALIDATION', message: 'La liberación de reserva requiere un motivo' });
  }

  const draft = state.invoices.find((invoice) => invoice.id === input.draftId);
  if (!draft || draft.status !== 'DRAFT') {
    return err({ code: 'NOT_FOUND', message: 'Borrador no encontrado' });
  }

  if (!isAbandonedDraft(draft)) {
    return err({
      code: 'CONFLICT',
      message: `El borrador sigue activo; debe tener al menos ${ABANDONED_DRAFT_AFTER_HOURS} horas para liberarlo desde recuperación`,
    });
  }

  const releasedItemIds = state.items
    .filter((item) => item.reservedByDraftId === draft.id)
    .map((item) => item.id);

  const discarded = discardDraft(state, actor, draft.id);
  if (!discarded.ok) {
    return discarded;
  }

  appendEvent(
    state,
    'RESERVATION_RELEASED',
    `Reserva abandonada de ${input.draftId} liberada`,
    actor,
    { draftId: input.draftId, reason, releasedItemIds },
  );

  return ok({ draftId: input.draftId, releasedItemIds });
}
