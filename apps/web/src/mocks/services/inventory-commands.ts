import type {
  AddToDraftInput,
  AddToDraftResult,
  AssemblyBaselineEntry,
  BaselineCorrectionInput,
  CostCorrectionInput,
  ManualWorkOrderInput,
  NoDesarmarInput,
  RegisterAssemblyInput,
  RegisterAssemblyResult,
  RegisterItemInput,
  RegisterQtyProductInput,
  ResolveCatalogReviewInput,
} from '../../api/contracts/inventory';
import type {
  AppEvent,
  AppState,
  Invoice,
  InvoiceLine,
  Item,
  KnownMissingComponent,
  QtyProduct,
  User,
  WorkOrder,
} from '../../api/contracts/entities';
import { err, ok, type Result } from '../../shared/auth/types';
import { DEMO_NOW_ISO } from '../data/demo-clock';
import {
  availableToReserve,
  collectSubtree,
  isAssemblyItem,
  isComplete,
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

function normalizeText(value: string): string {
  return value.trim();
}

function inventoryIdExists(state: AppState, id: string): boolean {
  const normalized = normalizeText(id).toLocaleLowerCase();
  return (
    state.items.some((entry) => entry.id.toLocaleLowerCase() === normalized) ||
    state.qtyProducts.some((entry) => entry.id.toLocaleLowerCase() === normalized)
  );
}

function validateFiniteNonNegative(value: number | undefined, label: string): Result<void> {
  if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
    return err({ code: 'VALIDATION', message: `${label} debe ser un número válido no negativo` });
  }
  return ok(undefined);
}

function buildRegisteredItem(
  state: AppState,
  input: RegisterItemInput,
  relationship: Item['physicalRelationship'],
  parentId?: string,
): Result<Item> {
  const id = normalizeText(input.id);
  const name = normalizeText(input.name);
  if (!id || !name || !normalizeText(input.categoryId)) {
    return err({ code: 'VALIDATION', message: 'ID, nombre y categoría son obligatorios' });
  }
  if (inventoryIdExists(state, id)) {
    return err({ code: 'CONFLICT', message: `El ID ${id} ya existe` });
  }

  const category = state.categories.find((entry) => entry.id === input.categoryId);
  if (!category) {
    return err({ code: 'VALIDATION', message: 'La categoría seleccionada no existe' });
  }

  const costValidation = validateFiniteNonNegative(input.acquisitionCostDop, 'El costo');
  if (!costValidation.ok) {
    return costValidation;
  }

  const attributes = Object.fromEntries(
    Object.entries(input.attributes ?? {})
      .map(([key, value]) => [key.trim(), value.trim()])
      .filter(([key, value]) => key && value),
  );
  const photos = [...new Set((input.photos ?? []).map((photo) => photo.trim()).filter(Boolean))];
  const item: Item = {
    id,
    name,
    categoryId: category.id,
    condition: input.condition,
    commercialState: 'AVAILABLE',
    physicalRelationship: relationship,
    // Assembly completeness is assigned only after its own baseline is validated.
    complete: false,
    photos,
  };

  const optionalFields = {
    brand: optionalText(input.brand),
    model: optionalText(input.model),
    serial: optionalText(input.serial),
    partNumber: optionalText(input.partNumber),
    costProvenance: optionalText(input.costProvenance),
    location: relationship === 'INDEPENDENT' ? optionalText(input.location) : undefined,
    notes: optionalText(input.notes),
  };
  Object.assign(
    item,
    Object.fromEntries(Object.entries(optionalFields).filter(([, value]) => value !== undefined)),
  );
  if (input.acquisitionCostDop !== undefined) {
    item.acquisitionCostDop = input.acquisitionCostDop;
  }
  if (Object.keys(attributes).length > 0) {
    item.attributes = attributes;
  }
  if (parentId) {
    item.parentId = parentId;
  }
  return ok(item);
}

export function registerItem(state: AppState, actor: User, input: RegisterItemInput): Result<Item> {
  const built = buildRegisteredItem(state, input, 'INDEPENDENT');
  if (!built.ok) {
    return built;
  }
  if (isAssemblyItem(built.value, state.categories)) {
    return err({
      code: 'VALIDATION',
      message: 'Los ensamblajes requieren completar el checklist de recepción',
    });
  }

  state.items.push(built.value);
  appendEvent(state, 'ITEM_REGISTERED', `${built.value.id} registrado en inventario`, actor, {
    itemId: built.value.id,
    mode: 'INDIVIDUAL',
  });
  return ok(built.value);
}

export function registerQtyProduct(
  state: AppState,
  actor: User,
  input: RegisterQtyProductInput,
): Result<QtyProduct> {
  const id = normalizeText(input.id);
  const name = normalizeText(input.name);
  if (!id || !name || !normalizeText(input.categoryId)) {
    return err({ code: 'VALIDATION', message: 'ID, nombre y categoría son obligatorios' });
  }
  if (inventoryIdExists(state, id)) {
    return err({ code: 'CONFLICT', message: `El ID ${id} ya existe` });
  }
  const category = state.categories.find((entry) => entry.id === input.categoryId);
  if (!category) {
    return err({ code: 'VALIDATION', message: 'La categoría seleccionada no existe' });
  }
  if (category.isAssembly) {
    return err({ code: 'VALIDATION', message: 'Un ensamblaje no puede registrarse por cantidad' });
  }
  if (!Number.isInteger(input.initialQuantity) || input.initialQuantity < 0) {
    return err({
      code: 'VALIDATION',
      message: 'La existencia inicial debe ser un entero no negativo',
    });
  }
  if (input.unitCostDop === undefined) {
    return err({ code: 'VALIDATION', message: 'El costo unitario es obligatorio' });
  }
  const costValidation = validateFiniteNonNegative(input.unitCostDop, 'El costo unitario');
  if (!costValidation.ok) {
    return costValidation;
  }

  const product: QtyProduct = {
    id,
    name,
    categoryId: category.id,
    onHand: input.initialQuantity,
    reserved: 0,
    unitCostDop: input.unitCostDop,
  };
  const brand = optionalText(input.brand);
  const location = optionalText(input.location);
  if (brand) product.brand = brand;
  if (location) product.location = location;

  state.qtyProducts.push(product);
  appendEvent(state, 'QTY_PRODUCT_REGISTERED', `${product.id} registrado por cantidad`, actor, {
    qtyProductId: product.id,
    initialQuantity: product.onHand,
  });
  return ok(product);
}

export function registerAssembly(
  state: AppState,
  actor: User,
  input: RegisterAssemblyInput,
): Result<RegisterAssemblyResult> {
  type BaselineSnapshot = {
    itemId: string;
    categoryId: string;
    complete: boolean;
    baseline: {
      expectedComponentName: string;
      status: AssemblyBaselineEntry['status'];
      child?: BaselineSnapshot;
    }[];
  };

  const stagedItems: Item[] = [];
  const missingComponents: KnownMissingComponent[] = [];
  const pendingIds = new Set<string>();

  const stageNode = (
    itemInput: RegisterItemInput,
    baseline: AssemblyBaselineEntry[] | undefined,
    relationship: Item['physicalRelationship'],
    parentId?: string,
    expectedCategoryName?: string,
  ): Result<{ item: Item; snapshot: BaselineSnapshot }> => {
    const built = buildRegisteredItem(state, itemInput, relationship, parentId);
    if (!built.ok) {
      return built;
    }
    const item = built.value;
    const itemKey = item.id.toLocaleLowerCase();
    if (pendingIds.has(itemKey)) {
      return err({ code: 'CONFLICT', message: `El ID ${item.id} está repetido` });
    }

    const category = state.categories.find((entry) => entry.id === item.categoryId)!;
    if (expectedCategoryName && category.name !== expectedCategoryName) {
      return err({
        code: 'VALIDATION',
        message: `La categoría de ${item.id} debe ser ${expectedCategoryName}`,
      });
    }
    if (!category.isAssembly) {
      if (baseline && baseline.length > 0) {
        return err({
          code: 'VALIDATION',
          message: `${item.id} no es un ensamblaje y no admite baseline`,
        });
      }
      pendingIds.add(itemKey);
      stagedItems.push(item);
      return ok({
        item,
        snapshot: { itemId: item.id, categoryId: item.categoryId, complete: false, baseline: [] },
      });
    }
    if (!baseline) {
      return err({
        code: 'VALIDATION',
        message: `Debe completar el baseline del ensamblaje ${item.id}`,
      });
    }

    const expected = category.expectedComponents ?? [];
    const receivedNames = baseline.map((entry) => normalizeText(entry.expectedComponentName));
    if (
      baseline.length !== expected.length ||
      new Set(receivedNames).size !== receivedNames.length ||
      expected.some((name) => !receivedNames.includes(name))
    ) {
      return err({
        code: 'VALIDATION',
        message: `Debe completar una sola respuesta para cada componente esperado de ${item.id}`,
      });
    }

    pendingIds.add(itemKey);
    stagedItems.push(item);
    const directMissing: KnownMissingComponent[] = [];
    const snapshotEntries: BaselineSnapshot['baseline'] = [];

    for (const expectedName of expected) {
      const entry = baseline.find(
        (candidate) => normalizeText(candidate.expectedComponentName) === expectedName,
      )!;
      if (entry.status === 'PRESENT') {
        if (!entry.item) {
          return err({
            code: 'VALIDATION',
            message: `Complete los datos del componente presente: ${expectedName}`,
          });
        }
        const childResult = stageNode(
          entry.item,
          entry.baseline,
          'INSTALLED',
          item.id,
          expectedName,
        );
        if (!childResult.ok) {
          return childResult;
        }
        snapshotEntries.push({
          expectedComponentName: expectedName,
          status: entry.status,
          child: childResult.value.snapshot,
        });
      } else if (entry.status === 'MISSING') {
        const missing: KnownMissingComponent = {
          id: nextNumericId(
            [
              ...state.knownMissing.map((candidate) => candidate.id),
              ...missingComponents.map((candidate) => candidate.id),
            ],
            'KM-',
            3,
          ),
          parentId: item.id,
          expectedComponentName: expectedName,
          origin: 'MISSING_AT_RECEIPT',
        };
        directMissing.push(missing);
        missingComponents.push(missing);
        snapshotEntries.push({ expectedComponentName: expectedName, status: entry.status });
      } else if (entry.status === 'NOT_APPLICABLE') {
        snapshotEntries.push({ expectedComponentName: expectedName, status: entry.status });
      } else {
        return err({ code: 'VALIDATION', message: `Estado inválido para ${expectedName}` });
      }
    }

    item.complete = directMissing.length === 0;
    return ok({
      item,
      snapshot: {
        itemId: item.id,
        categoryId: item.categoryId,
        complete: item.complete,
        baseline: snapshotEntries,
      },
    });
  };

  const rootResult = stageNode(input.parent, input.baseline, 'INDEPENDENT');
  if (!rootResult.ok) {
    return rootResult;
  }
  const parent = rootResult.value.item;
  if (!isAssemblyItem(parent, state.categories)) {
    return err({ code: 'VALIDATION', message: 'La categoría seleccionada no es un ensamblaje' });
  }

  // Commit only after every nested node and checklist has passed validation.
  state.items.push(...stagedItems);
  state.knownMissing.push(...missingComponents);
  appendEvent(state, 'ASSEMBLY_REGISTERED', `${parent.id} registrado con baseline inicial`, actor, {
    itemId: parent.id,
    receiptTree: rootResult.value.snapshot,
  });
  return ok({ parent, children: stagedItems.slice(1), missingComponents });
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

/**
 * Administrator resolves a catalog-grown slot:
 * - NOT_APPLICABLE / ACKNOWLEDGE: no Known Missing Component
 * - MISSING: creates MISSING_AT_RECEIPT and Incomplete
 * - PRESENT: registers a real installed child on this parent (receipt composition, not a Work Order)
 */
export function resolveCatalogReview(
  state: AppState,
  actor: User,
  input: ResolveCatalogReviewInput,
): Result<Item> {
  const expectedComponentName = optionalText(input.expectedComponentName);
  if (!expectedComponentName) {
    return err({ code: 'VALIDATION', message: 'Indique el componente pendiente de validar' });
  }

  const allowed = new Set(['NOT_APPLICABLE', 'MISSING', 'PRESENT', 'ACKNOWLEDGE']);
  if (!allowed.has(input.decision)) {
    return err({
      code: 'VALIDATION',
      message: 'La decisión debe ser confirmar NA, marcar falta, registrar presente o reconocer coincidencia',
    });
  }

  const item = itemById(state.items, input.itemId);
  if (!item) {
    return err({ code: 'NOT_FOUND', message: 'Ítem no encontrado' });
  }

  const reviewIndex = state.pendingCatalogReviews.findIndex(
    (entry) =>
      entry.parentId === item.id && entry.expectedComponentName === expectedComponentName,
  );
  if (reviewIndex < 0) {
    return err({
      code: 'VALIDATION',
      message: `No hay una revisión pendiente de ${expectedComponentName} en ${item.id}`,
    });
  }

  const review = state.pendingCatalogReviews[reviewIndex]!;
  if (review.kind === 'ALREADY_PRESENT' && input.decision !== 'ACKNOWLEDGE') {
    return err({
      code: 'VALIDATION',
      message: `${expectedComponentName} ya está en el árbol; confirme que lo reconoció`,
    });
  }
  if (review.kind === 'PENDING_NA' && input.decision === 'ACKNOWLEDGE') {
    return err({
      code: 'VALIDATION',
      message: 'Este componente aún no está en el ensamblaje; confirme NA, márquelo falta o regístrelo presente',
    });
  }

  let childId: string | undefined;
  if (input.decision === 'PRESENT') {
    if (!input.item) {
      return err({
        code: 'VALIDATION',
        message: `Complete los datos de la pieza presente: ${expectedComponentName}`,
      });
    }
    const childCategory = state.categories.find((entry) => entry.id === input.item?.categoryId);
    if (!childCategory || childCategory.name !== expectedComponentName) {
      return err({
        code: 'VALIDATION',
        message: `La categoría de ${expectedComponentName} debe llamarse ${expectedComponentName}`,
      });
    }
    if (childCategory.isAssembly) {
      if (!input.baseline) {
        return err({
          code: 'VALIDATION',
          message: `Complete el baseline del ensamblaje ${expectedComponentName}`,
        });
      }
      const registered = registerAssembly(state, actor, {
        parent: input.item,
        baseline: input.baseline,
      });
      if (!registered.ok) {
        return registered;
      }
      registered.value.parent.physicalRelationship = 'INSTALLED';
      registered.value.parent.parentId = item.id;
      registered.value.parent.location = undefined;
      childId = registered.value.parent.id;
    } else {
      const built = buildRegisteredItem(state, input.item, 'INSTALLED', item.id);
      if (!built.ok) {
        return built;
      }
      state.items.push(built.value);
      childId = built.value.id;
    }
  }

  const beforeComplete = isComplete(item, state.knownMissing, state.categories);
  state.pendingCatalogReviews.splice(reviewIndex, 1);

  if (input.decision === 'MISSING') {
    const missing: KnownMissingComponent = {
      id: nextNumericId(
        state.knownMissing.map((candidate) => candidate.id),
        'KM-',
        3,
      ),
      parentId: item.id,
      expectedComponentName,
      origin: 'MISSING_AT_RECEIPT',
    };
    state.knownMissing.push(missing);
  }

  syncDirectParentCompleteness(item, state.knownMissing, state.categories);

  const description =
    input.decision === 'MISSING'
      ? `${expectedComponentName} marcado como falta en ${item.id}`
      : input.decision === 'PRESENT'
        ? `${childId} registrado como ${expectedComponentName} en ${item.id}`
        : input.decision === 'ACKNOWLEDGE'
          ? `${expectedComponentName} ya presente en ${item.id} reconocido`
          : `${expectedComponentName} confirmado como no aplica en ${item.id}`;

  appendEvent(state, 'CATALOG_REVIEW_RESOLVED', description, actor, {
    itemId: item.id,
    expectedComponentName,
    decision: input.decision,
    childId: childId ?? review.matchedChildId ?? null,
    beforeComplete,
    afterComplete: item.complete,
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
