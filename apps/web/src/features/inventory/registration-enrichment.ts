import type { AssemblyBaselineEntry, RegisterItemInput } from '../../api/contracts/inventory';

export type RegistrationMode = 'INDIVIDUAL' | 'QUANTITY';

/** Operational labels for data that INV-002 allows after the practical minimum. */
export const ENRICHMENT_LABELS = {
  brand: 'Marca',
  model: 'Modelo',
  serial: 'Serial',
  partNumber: 'Número de parte',
  acquisitionCost: 'Costo de adquisición',
  location: 'Ubicación',
  attributes: 'Atributos',
  notes: 'Notas',
  photos: 'Fotos',
} as const;

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

/**
 * Lists enrichment still empty after a valid save so the UI can say
 * what to complete later, without inventing extra required fields.
 */
export function pendingEnrichmentLabels(
  mode: RegistrationMode,
  item: Pick<
    RegisterItemInput,
    | 'brand'
    | 'model'
    | 'serial'
    | 'partNumber'
    | 'acquisitionCostDop'
    | 'location'
    | 'attributes'
    | 'notes'
    | 'photos'
  >,
): string[] {
  const pending: string[] = [];

  if (!hasText(item.brand)) {
    pending.push(ENRICHMENT_LABELS.brand);
  }
  if (!hasText(item.location)) {
    pending.push(ENRICHMENT_LABELS.location);
  }

  if (mode === 'QUANTITY') {
    return pending;
  }

  if (!hasText(item.model)) {
    pending.push(ENRICHMENT_LABELS.model);
  }
  if (!hasText(item.serial)) {
    pending.push(ENRICHMENT_LABELS.serial);
  }
  if (!hasText(item.partNumber)) {
    pending.push(ENRICHMENT_LABELS.partNumber);
  }
  if (item.acquisitionCostDop == null) {
    pending.push(ENRICHMENT_LABELS.acquisitionCost);
  }
  if (!item.attributes || Object.keys(item.attributes).length === 0) {
    pending.push(ENRICHMENT_LABELS.attributes);
  }
  if (!hasText(item.notes)) {
    pending.push(ENRICHMENT_LABELS.notes);
  }
  if (!item.photos?.length) {
    pending.push(ENRICHMENT_LABELS.photos);
  }

  return pending;
}

export function parseAttributeLines(value: string): Record<string, string> | undefined {
  const entries = value
    .split('\n')
    .map((line) => line.split(':', 2).map((part) => part.trim()))
    .filter(([key, entryValue]) => key && entryValue);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/** Keep already-entered checklist rows when returning to step 2. */
export function mergeBaselineEntries(
  expectedNames: string[],
  previous: AssemblyBaselineEntry[],
): AssemblyBaselineEntry[] {
  const previousByName = new Map(
    previous.map((entry) => [entry.expectedComponentName, entry]),
  );
  return expectedNames.map(
    (expectedComponentName) =>
      previousByName.get(expectedComponentName) ?? {
        expectedComponentName,
        status: 'MISSING',
      },
  );
}
