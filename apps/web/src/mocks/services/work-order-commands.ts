import type { AppEvent, AppState, User, WorkOrder } from '../../api/contracts/entities';
import type { ManualWorkOrderInput } from '../../api/contracts/inventory';
import type { CancelWorkOrderInput, ReassignWorkOrderInput } from '../../api/contracts/work-orders';
import { err, ok, type Result } from '../../shared/auth/types';
import { DEMO_NOW_ISO } from '../data/demo-clock';
import { createManualWorkOrder } from './inventory-commands';
import { findWorkOrder, isActiveStatus } from './work-order-catalog';

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

function requireReason(reason: string | undefined): Result<string> {
  const trimmed = reason?.trim() ?? '';
  if (!trimmed) {
    return err({ code: 'VALIDATION', message: 'Indique el motivo' });
  }
  return ok(trimmed);
}

function loadActiveOrder(state: AppState, workOrderId: string): Result<WorkOrder> {
  const order = findWorkOrder(state, workOrderId);
  if (!order) {
    return err({ code: 'NOT_FOUND', message: 'OT no encontrada' });
  }

  if (order.status === 'COMPLETED') {
    return err({
      code: 'CONFLICT',
      message: 'Una OT completada no se modifica; el reverso requiere una OT opuesta',
    });
  }

  if (order.status === 'CANCELLED') {
    return err({ code: 'CONFLICT', message: 'Esta OT ya está cancelada' });
  }

  if (!isActiveStatus(order.status)) {
    return err({ code: 'CONFLICT', message: 'La OT no admite esta acción' });
  }

  return ok(order);
}

/**
 * Admin-only wrappers around inventory's shared create path.
 * Creation never changes hierarchy; completion (WM10) does.
 */
export function createManualDesarme(
  state: AppState,
  actor: User,
  input: Omit<ManualWorkOrderInput, 'type'>,
): Result<WorkOrder> {
  return createManualWorkOrder(state, actor, { ...input, type: 'DISMANTLING' });
}

export function createInstalacion(
  state: AppState,
  actor: User,
  input: Omit<ManualWorkOrderInput, 'type'> & { destinationParentId?: string },
): Result<WorkOrder> {
  return createManualWorkOrder(state, actor, { ...input, type: 'INSTALLATION' });
}

export function reassignOrder(
  state: AppState,
  actor: User,
  input: ReassignWorkOrderInput,
): Result<WorkOrder> {
  const reason = requireReason(input.reason);
  if (!reason.ok) {
    return reason;
  }

  const loaded = loadActiveOrder(state, input.workOrderId);
  if (!loaded.ok) {
    return loaded;
  }

  const mechanic = state.users.find((user) => user.id === input.mechanicId);
  if (!mechanic || mechanic.role !== 'MECHANIC') {
    return err({ code: 'VALIDATION', message: 'Seleccione un mecánico válido' });
  }

  if (!mechanic.active) {
    return err({ code: 'VALIDATION', message: 'El mecánico está desactivado' });
  }

  const order = loaded.value;
  if (order.assignedMechanicId === mechanic.id) {
    return err({
      code: 'VALIDATION',
      message: 'La OT ya está asignada a este mecánico',
    });
  }

  const previousAssigneeId = order.assignedMechanicId;
  order.assignedMechanicId = mechanic.id;
  order.status = 'IN_PROGRESS';

  appendEvent(
    state,
    'WORK_ORDER_REASSIGNED',
    `OT ${order.id} reasignada a ${mechanic.name}`,
    actor,
    {
      workOrderId: order.id,
      previousAssigneeId,
      assignedMechanicId: mechanic.id,
      reason: reason.value,
    },
  );

  return ok(order);
}

export function cancelOrder(
  state: AppState,
  actor: User,
  input: CancelWorkOrderInput,
): Result<WorkOrder> {
  const reason = requireReason(input.reason);
  if (!reason.ok) {
    return reason;
  }

  const loaded = loadActiveOrder(state, input.workOrderId);
  if (!loaded.ok) {
    return loaded;
  }

  const order = loaded.value;

  if (order.status === 'IN_PROGRESS' && !input.physicalVerified) {
    return err({
      code: 'VALIDATION',
      message: 'Confirme que verificó el estado físico antes de cancelar una OT en proceso',
    });
  }

  const previousStatus = order.status;
  const previousAssigneeId = order.assignedMechanicId;
  order.status = 'CANCELLED';
  order.cancelReason = reason.value;
  order.cancelledAt = DEMO_NOW_ISO;

  appendEvent(
    state,
    'WORK_ORDER_CANCELLED',
    `OT ${order.id} cancelada`,
    actor,
    {
      workOrderId: order.id,
      previousStatus,
      previousAssigneeId,
      reason: reason.value,
      physicalVerified: Boolean(input.physicalVerified),
    },
  );

  return ok(order);
}
