import type {
  AppEvent,
  AppState,
  Item,
  KnownMissingComponent,
  User,
  WorkOrder,
} from '../../api/contracts/entities';
import type { ManualWorkOrderInput } from '../../api/contracts/inventory';
import type {
  AddWorkOrderPhotoInput,
  CancelWorkOrderInput,
  CompleteWorkOrderInput,
  ReassignWorkOrderInput,
} from '../../api/contracts/work-orders';
import { err, ok, type Result } from '../../shared/auth/types';
import { DEMO_NOW_ISO } from '../data/demo-clock';
import { createManualWorkOrder } from './inventory-commands';
import {
  collectSubtree,
  isAssemblyItem,
  itemById,
  protectedAncestor,
  syncDirectParentCompleteness,
} from './inventory-helpers';
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

function requireAssignedInProgress(order: WorkOrder, actor: User): Result<WorkOrder> {
  if (order.status !== 'IN_PROGRESS') {
    return err({ code: 'CONFLICT', message: 'La OT debe estar en proceso' });
  }

  if (order.assignedMechanicId !== actor.id) {
    return err({
      code: 'FORBIDDEN',
      message: 'Solo el mecánico asignado puede modificar esta OT',
    });
  }

  return ok(order);
}

function requireEvidence(order: WorkOrder): Result<void> {
  if (order.beforePhotos.length === 0 || order.afterPhotos.length === 0) {
    return err({
      code: 'VALIDATION',
      message: 'Se requiere al menos una foto BEFORE y una AFTER',
    });
  }
  return ok(undefined);
}

function categoryLabel(state: AppState, piece: Item): string {
  return state.categories.find((entry) => entry.id === piece.categoryId)?.name ?? piece.name;
}

function matchingKnownMissing(
  state: AppState,
  parentId: string,
  piece: Item,
): KnownMissingComponent | undefined {
  const expected = categoryLabel(state, piece);
  return state.knownMissing.find(
    (entry) => entry.parentId === parentId && entry.expectedComponentName === expected,
  );
}

/**
 * WO-004: one conditional assignment. In the mock this is a single check-then-set
 * on the shared AppState; the future HTTP API must keep the same atomic semantics.
 */
export function takeOrder(state: AppState, actor: User, workOrderId: string): Result<WorkOrder> {
  if (actor.role !== 'MECHANIC') {
    return err({ code: 'FORBIDDEN', message: 'Solo un mecánico puede tomar una OT de la cola' });
  }

  const order = findWorkOrder(state, workOrderId);
  if (!order) {
    return err({ code: 'NOT_FOUND', message: 'OT no encontrada' });
  }

  if (order.status !== 'PENDING' || order.assignedMechanicId) {
    return err({ code: 'CONFLICT', message: 'Esta OT ya fue tomada' });
  }

  order.assignedMechanicId = actor.id;
  order.status = 'IN_PROGRESS';

  appendEvent(state, 'WORK_ORDER_CLAIMED', `OT ${order.id} tomada por ${actor.name}`, actor, {
    workOrderId: order.id,
    assignedMechanicId: actor.id,
  });

  return ok(order);
}

export function addPhoto(
  state: AppState,
  actor: User,
  input: AddWorkOrderPhotoInput,
): Result<WorkOrder> {
  const order = findWorkOrder(state, input.workOrderId);
  if (!order) {
    return err({ code: 'NOT_FOUND', message: 'OT no encontrada' });
  }

  const owned = requireAssignedInProgress(order, actor);
  if (!owned.ok) {
    return owned;
  }

  const fileName = input.fileName.trim();
  if (!fileName) {
    return err({ code: 'VALIDATION', message: 'Seleccione una foto' });
  }

  if (input.kind === 'BEFORE') {
    order.beforePhotos.push(fileName);
  } else {
    order.afterPhotos.push(fileName);
  }

  appendEvent(
    state,
    'WORK_ORDER_EVIDENCE_ADDED',
    `Evidencia ${input.kind} agregada a ${order.id}`,
    actor,
    { workOrderId: order.id, kind: input.kind, fileName },
  );

  return ok(order);
}

export function completeDesarme(
  state: AppState,
  actor: User,
  input: CompleteWorkOrderInput,
): Result<WorkOrder> {
  const order = findWorkOrder(state, input.workOrderId);
  if (!order) {
    return err({ code: 'NOT_FOUND', message: 'OT no encontrada' });
  }

  if (order.type !== 'DISMANTLING') {
    return err({ code: 'VALIDATION', message: 'Esta OT no es de desarme' });
  }

  const owned = requireAssignedInProgress(order, actor);
  if (!owned.ok) {
    return owned;
  }

  const evidence = requireEvidence(order);
  if (!evidence.ok) {
    return evidence;
  }

  const piece = itemById(state.items, order.pieceId);
  if (!piece) {
    return err({ code: 'NOT_FOUND', message: 'Ítem no encontrado' });
  }

  const restriction = protectedAncestor(state.items, piece);
  if (restriction && restriction.id !== piece.id) {
    return err({
      code: 'CONFLICT',
      message: `No desarmar en ${restriction.id} impide completar este desarme`,
      details: { protectedRootId: restriction.id },
    });
  }

  if (
    piece.physicalRelationship !== 'INSTALLED' ||
    !piece.parentId ||
    piece.parentId !== order.sourceParentId
  ) {
    return err({
      code: 'CONFLICT',
      message: 'La relación física ya no coincide con esta OT; no se aplica el desarme',
    });
  }

  const parent = itemById(state.items, piece.parentId);
  if (!parent) {
    return err({ code: 'CONFLICT', message: 'El padre de origen ya no existe' });
  }

  const parentId = parent.id;
  piece.physicalRelationship = 'INDEPENDENT';
  piece.parentId = undefined;
  piece.location = input.location?.trim() || undefined;

  const missing: KnownMissingComponent = {
    id: nextNumericId(
      state.knownMissing.map((entry) => entry.id),
      'KM-',
      3,
    ),
    parentId,
    expectedComponentName: categoryLabel(state, piece),
    origin: 'REMOVED_AFTER_BASELINE',
    formerItemId: piece.id,
    workOrderId: order.id,
  };
  state.knownMissing.push(missing);
  syncDirectParentCompleteness(parent, state.knownMissing, state.categories);

  order.status = 'COMPLETED';

  appendEvent(
    state,
    'DISMANTLING_COMPLETED',
    `${piece.id} retirado de ${parentId} (${order.id}). Queda independiente; el padre registra el faltante.`,
    actor,
    {
      itemId: piece.id,
      parentId,
      workOrderId: order.id,
    },
  );

  return ok(order);
}

export function completeInstalacion(
  state: AppState,
  actor: User,
  input: CompleteWorkOrderInput,
): Result<WorkOrder> {
  const order = findWorkOrder(state, input.workOrderId);
  if (!order) {
    return err({ code: 'NOT_FOUND', message: 'OT no encontrada' });
  }

  if (order.type !== 'INSTALLATION') {
    return err({ code: 'VALIDATION', message: 'Esta OT no es de instalación' });
  }

  const owned = requireAssignedInProgress(order, actor);
  if (!owned.ok) {
    return owned;
  }

  const evidence = requireEvidence(order);
  if (!evidence.ok) {
    return evidence;
  }

  const piece = itemById(state.items, order.pieceId);
  if (!piece) {
    return err({ code: 'NOT_FOUND', message: 'Ítem no encontrado' });
  }

  if (piece.physicalRelationship !== 'INDEPENDENT' || piece.parentId) {
    return err({
      code: 'CONFLICT',
      message: 'La pieza ya no está independiente; no se aplica la instalación',
    });
  }

  const destinationId = order.destinationParentId;
  if (!destinationId) {
    return err({ code: 'CONFLICT', message: 'La OT no tiene destino' });
  }

  const destination = itemById(state.items, destinationId);
  if (!destination) {
    return err({ code: 'NOT_FOUND', message: 'El destino no existe' });
  }

  if (!isAssemblyItem(destination, state.categories)) {
    return err({ code: 'VALIDATION', message: 'El destino debe ser un ensamblaje' });
  }

  if (destinationId === piece.id) {
    return err({ code: 'VALIDATION', message: 'Una pieza no puede instalarse en sí misma' });
  }

  if (collectSubtree(state.items, piece.id).some((child) => child.id === destinationId)) {
    return err({
      code: 'VALIDATION',
      message: 'No se puede instalar una pieza en uno de sus descendientes',
    });
  }

  piece.physicalRelationship = 'INSTALLED';
  piece.parentId = destinationId;

  const resolved = matchingKnownMissing(state, destinationId, piece);
  if (resolved) {
    state.knownMissing = state.knownMissing.filter((entry) => entry.id !== resolved.id);
  }

  syncDirectParentCompleteness(destination, state.knownMissing, state.categories);
  order.status = 'COMPLETED';

  appendEvent(
    state,
    'INSTALLATION_COMPLETED',
    `${piece.id} instalado en ${destinationId} (${order.id})`,
    actor,
    {
      itemId: piece.id,
      parentId: destinationId,
      workOrderId: order.id,
      resolvedMissingId: resolved?.id,
    },
  );

  return ok(order);
}
