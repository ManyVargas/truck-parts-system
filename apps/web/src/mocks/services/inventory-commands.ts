import type {
  AddToDraftInput,
  AddToDraftResult,
  BaselineCorrectionInput,
  CostCorrectionInput,
  ManualWorkOrderInput,
  NoDesarmarInput,
} from '../../api/contracts/inventory';
import type {
  AppEvent,
  AppState,
  Invoice,
  InvoiceLine,
  Item,
  User,
  WorkOrder,
} from '../../api/contracts/entities';
import { err, ok, type Result } from '../../shared/auth/types';
import { DEMO_NOW_ISO } from '../data/demo-clock';
import {
  availableToReserve,
  collectSubtree,
  isAssemblyItem,
  itemById,
  overlappingReservation,
  protectedAncestor,
  syncDirectParentCompleteness,
} from './inventory-helpers';

function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

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

function openDraft(state: AppState): Invoice {
  const existing = state.invoices.find((invoice) => invoice.status === 'DRAFT');
  if (existing) {
    return existing;
  }

  const draft: Invoice = {
    id: nextNumericId(
      state.invoices.map((invoice) => invoice.id),
      'INV-DRAFT-',
      2,
    ),
    status: 'DRAFT',
    customerId: 'C0',
    currency: 'DOP',
    fiscal: false,
    lines: [],
    payments: [],
    paymentState: 'UNPAID',
    createdAt: DEMO_NOW_ISO,
  };
  state.invoices.push(draft);
  return draft;
}

function nextLineId(draft: Invoice): string {
  return nextNumericId(
    draft.lines.map((line) => line.id),
    'L-D',
    1,
  );
}

function addItemLine(draft: Invoice, item: Item): InvoiceLine {
  const line: InvoiceLine = {
    id: nextLineId(draft),
    type: 'ITEM',
    description: item.name,
    itemId: item.id,
    quantity: 1,
    unitPrice: 0,
    taxable: true,
    pricePending: true,
  };
  draft.lines.push(line);
  return line;
}

/**
 * Reserves eligible inventory on the open draft (creates one if needed).
 * `No desarmar` descendants are rejected here — not only hidden in UI.
 */
export function addInventoryToDraft(
  state: AppState,
  actor: User,
  input: AddToDraftInput,
): Result<AddToDraftResult> {
  if (input.itemId && input.qtyProductId) {
    return err({
      code: 'VALIDATION',
      message: 'Indique un ítem o un producto de cantidad, no ambos',
    });
  }

  if (!input.itemId && !input.qtyProductId) {
    return err({ code: 'VALIDATION', message: 'Indique el inventario a agregar' });
  }

  const existingDraft = state.invoices.find((invoice) => invoice.status === 'DRAFT');

  if (input.itemId) {
    const item = itemById(state.items, input.itemId);
    if (!item) {
      return err({ code: 'NOT_FOUND', message: 'Ítem no encontrado' });
    }

    if (item.commercialState === 'SOLD') {
      return err({ code: 'VALIDATION', message: 'Este ítem ya está vendido' });
    }

    const restriction = protectedAncestor(state.items, item);
    if (restriction && restriction.id !== item.id) {
      return err({
        code: 'VALIDATION',
        message: `No se puede vender por separado: No desarmar en ${restriction.id}`,
        details: { protectedRootId: restriction.id },
      });
    }

    if (existingDraft && item.reservedByDraftId === existingDraft.id) {
      return ok({ draftId: existingDraft.id, alreadyInDraft: true });
    }

    if (item.reservedByDraftId && item.reservedByDraftId !== existingDraft?.id) {
      return err({
        code: 'CONFLICT',
        message: `Reservado en el borrador ${item.reservedByDraftId}`,
      });
    }

    const overlap = overlappingReservation(state.items, item, existingDraft?.id ?? '');
    if (overlap) {
      return err({
        code: 'CONFLICT',
        message: `Hay una reserva solapada en ${overlap.id}`,
      });
    }

    const draft = existingDraft ?? openDraft(state);
    addItemLine(draft, item);
    item.reservedByDraftId = draft.id;
    // RES-001: reservation must not mark the item Sold.
    appendEvent(state, 'ITEM_RESERVED', `${item.id} reservado en borrador ${draft.id}`, actor, {
      itemId: item.id,
      draftId: draft.id,
    });

    return ok({ draftId: draft.id, alreadyInDraft: false });
  }

  const product = state.qtyProducts.find((entry) => entry.id === input.qtyProductId);
  if (!product) {
    return err({ code: 'NOT_FOUND', message: 'Producto no encontrado' });
  }

  const quantity = input.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return err({ code: 'VALIDATION', message: 'La cantidad debe ser un entero mayor que cero' });
  }

  const available = availableToReserve(product.onHand, product.reserved);
  if (quantity > available) {
    return err({
      code: 'VALIDATION',
      message: `Solo hay ${available} unidad(es) disponible(s)`,
    });
  }

  const draft = existingDraft ?? openDraft(state);
  const existingLine = draft.lines.find((line) => line.qtyProductId === product.id);
  if (existingLine) {
    existingLine.quantity += quantity;
  } else {
    draft.lines.push({
      id: nextLineId(draft),
      type: 'QTY',
      description: product.name,
      qtyProductId: product.id,
      quantity,
      unitPrice: 0,
      taxable: true,
      pricePending: true,
    });
  }

  product.reserved += quantity;
  appendEvent(
    state,
    'QTY_RESERVED',
    `${quantity} × ${product.id} reservado en borrador ${draft.id}`,
    actor,
    { qtyProductId: product.id, draftId: draft.id, quantity },
  );

  return ok({ draftId: draft.id, alreadyInDraft: false });
}

export function setNoDesarmar(state: AppState, actor: User, input: NoDesarmarInput): Result<Item> {
  const item = itemById(state.items, input.itemId);
  if (!item) {
    return err({ code: 'NOT_FOUND', message: 'Ítem no encontrado' });
  }

  if (!isAssemblyItem(item, state.categories)) {
    return err({
      code: 'VALIDATION',
      message: 'No desarmar solo aplica a ensamblajes',
    });
  }

  item.noDesarmar = input.enabled || undefined;
  appendEvent(
    state,
    input.enabled ? 'NO_DESARMAR_APPLIED' : 'NO_DESARMAR_REMOVED',
    input.enabled ? `No desarmar aplicado a ${item.id}` : `No desarmar retirado de ${item.id}`,
    actor,
    { itemId: item.id, enabled: input.enabled },
  );

  return ok(item);
}

export function correctAcquisitionCost(
  state: AppState,
  actor: User,
  input: CostCorrectionInput,
): Result<Item> {
  const reason = optionalText(input.reason);
  if (!reason) {
    return err({ code: 'VALIDATION', message: 'La corrección de costo requiere un motivo' });
  }

  const item = itemById(state.items, input.itemId);
  if (!item) {
    return err({ code: 'NOT_FOUND', message: 'Ítem no encontrado' });
  }

  if (
    input.acquisitionCostDop != null &&
    (!Number.isFinite(input.acquisitionCostDop) || input.acquisitionCostDop < 0)
  ) {
    return err({ code: 'VALIDATION', message: 'El costo debe ser un número válido no negativo' });
  }

  const before = item.acquisitionCostDop;
  const beforeCostProvenance = item.costProvenance;
  if (input.acquisitionCostDop == null) {
    delete item.acquisitionCostDop;
  } else {
    item.acquisitionCostDop = input.acquisitionCostDop;
  }

  if (input.costProvenance !== undefined) {
    const provenance = optionalText(input.costProvenance ?? undefined);
    if (provenance) {
      item.costProvenance = provenance;
    } else {
      delete item.costProvenance;
    }
  }

  appendEvent(state, 'COST_CORRECTED', `Costo de ${item.id} corregido`, actor, {
    itemId: item.id,
    reason,
    before: before ?? null,
    after: item.acquisitionCostDop ?? null,
    beforeCostProvenance: beforeCostProvenance ?? null,
    afterCostProvenance: item.costProvenance ?? null,
  });

  return ok(item);
}

/**
 * Administrator baseline repair: mark MISSING_AT_RECEIPT conditions as not applicable.
 * Does not register present children (WM6) and does not imitate a Work Order.
 */
export function correctReceiptBaseline(
  state: AppState,
  actor: User,
  input: BaselineCorrectionInput,
): Result<Item> {
  const reason = optionalText(input.reason);
  if (!reason) {
    return err({ code: 'VALIDATION', message: 'La corrección de baseline requiere un motivo' });
  }

  const item = itemById(state.items, input.itemId);
  if (!item) {
    return err({ code: 'NOT_FOUND', message: 'Ítem no encontrado' });
  }

  const names = input.markNotApplicable.map((name) => name.trim()).filter(Boolean);
  if (names.length === 0) {
    return err({
      code: 'VALIDATION',
      message: 'Indique al menos un faltante a marcar como no aplica',
    });
  }

  const remaining: typeof state.knownMissing = [];
  const removed: string[] = [];

  for (const entry of state.knownMissing) {
    if (
      entry.parentId === item.id &&
      entry.origin === 'MISSING_AT_RECEIPT' &&
      names.includes(entry.expectedComponentName)
    ) {
      removed.push(entry.expectedComponentName);
      continue;
    }
    remaining.push(entry);
  }

  if (removed.length === 0) {
    return err({
      code: 'VALIDATION',
      message: 'Ningún faltante de recepción coincide con lo indicado',
    });
  }

  const beforeComplete = !state.knownMissing.some((entry) => entry.parentId === item.id);
  state.knownMissing = remaining;
  syncDirectParentCompleteness(item, state.knownMissing, state.categories);
  const afterComplete = item.complete;

  appendEvent(state, 'BASELINE_CORRECTED', `Baseline de ${item.id} corregido`, actor, {
    itemId: item.id,
    reason,
    removed,
    beforeComplete,
    afterComplete,
  });

  return ok(item);
}

export function createManualWorkOrder(
  state: AppState,
  actor: User,
  input: ManualWorkOrderInput,
): Result<WorkOrder> {
  const piece = itemById(state.items, input.pieceId);
  if (!piece) {
    return err({ code: 'NOT_FOUND', message: 'Ítem no encontrado' });
  }

  if (input.type === 'DISMANTLING') {
    if (piece.physicalRelationship !== 'INSTALLED' || !piece.parentId) {
      return err({
        code: 'VALIDATION',
        message: 'Solo se crea desarme sobre una pieza instalada',
      });
    }

    const restriction = protectedAncestor(state.items, piece);
    if (restriction && restriction.id !== piece.id) {
      return err({
        code: 'VALIDATION',
        message: `No desarmar en ${restriction.id} impide el desarme de este componente`,
        details: { protectedRootId: restriction.id },
      });
    }
  }

  if (input.type === 'INSTALLATION') {
    if (piece.physicalRelationship !== 'INDEPENDENT') {
      return err({
        code: 'VALIDATION',
        message: 'Solo se instala una pieza independiente',
      });
    }

    const destinationId = optionalText(input.destinationParentId);
    if (!destinationId) {
      return err({ code: 'VALIDATION', message: 'Indique el padre de destino' });
    }

    if (destinationId === piece.id) {
      return err({ code: 'VALIDATION', message: 'Una pieza no puede instalarse en sí misma' });
    }

    const destination = itemById(state.items, destinationId);
    if (!destination) {
      return err({ code: 'NOT_FOUND', message: 'El destino no existe' });
    }

    if (!isAssemblyItem(destination, state.categories)) {
      return err({
        code: 'VALIDATION',
        message: 'El destino debe ser un ensamblaje',
      });
    }

    if (collectSubtree(state.items, piece.id).some((child) => child.id === destinationId)) {
      return err({
        code: 'VALIDATION',
        message: 'No se puede instalar una pieza en uno de sus descendientes',
      });
    }
  }

  const active = state.workOrders.find(
    (order) =>
      order.pieceId === piece.id && (order.status === 'PENDING' || order.status === 'IN_PROGRESS'),
  );
  if (active) {
    return err({
      code: 'CONFLICT',
      message: `Ya existe una OT activa (${active.id}) para esta pieza`,
    });
  }

  const order: WorkOrder = {
    id: nextNumericId(
      state.workOrders.map((entry) => entry.id),
      'OD-DEMO-',
      3,
    ),
    type: input.type,
    status: 'PENDING',
    pieceId: piece.id,
    sourceParentId: input.type === 'DISMANTLING' ? piece.parentId : undefined,
    destinationParentId:
      input.type === 'INSTALLATION' ? optionalText(input.destinationParentId) : undefined,
    notes: optionalText(input.notes),
    beforePhotos: [],
    afterPhotos: [],
    createdAt: DEMO_NOW_ISO,
  };

  state.workOrders.push(order);
  appendEvent(
    state,
    'WORK_ORDER_CREATED',
    `OT ${order.id} (${order.type}) creada para ${piece.id}`,
    actor,
    { itemId: piece.id, workOrderId: order.id },
  );

  return ok(order);
}
