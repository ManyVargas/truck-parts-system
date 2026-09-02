export type CommercialDisplayState = 'AVAILABLE' | 'SOLD' | 'UNAVAILABLE';
export type PhysicalDisplayRelationship = 'INDEPENDENT' | 'INSTALLED';

/** Visual weight for inventory facts. Exceptions must outrank ordinary context. */
export type StatusVisualLayer = 'primary' | 'context' | 'exception';

export function commercialAvailabilityLabel(state: CommercialDisplayState): string {
  if (state === 'SOLD') {
    return 'Vendido';
  }
  if (state === 'UNAVAILABLE') {
    return 'No disponible';
  }
  return 'Disponible';
}

export function commercialAvailabilityLayer(state: CommercialDisplayState): StatusVisualLayer {
  return state === 'AVAILABLE' ? 'primary' : 'exception';
}

/** Installed is a relationship (SEARCH-002), not availability. Independent is shown so the Físico slot stays aligned. */
export function physicalRelationLabel(
  relationship?: PhysicalDisplayRelationship,
  parentName?: string,
): string {
  if (!relationship) {
    return 'Por cantidad';
  }
  if (relationship === 'INSTALLED') {
    return parentName ? `Instalado en ${parentName}` : 'Instalado';
  }
  return 'Independiente';
}

export function completenessLabel(complete?: boolean): string | null {
  if (complete == null) {
    return null;
  }
  return complete ? 'Completo' : 'Incompleto';
}

export function assemblyKindLabel(isAssembly?: boolean): string | null {
  return isAssembly ? 'Ensamblaje' : null;
}

export function isIncompleteException(complete?: boolean): boolean {
  return complete === false;
}
