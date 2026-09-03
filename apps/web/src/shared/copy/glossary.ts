/**
 * Official operator-facing terms for the web UI (UX 2.0 glossary).
 * Screens must reuse these strings instead of inventing synonyms.
 */
export const UX_TERMS = {
  availability: 'Disponibilidad',
  relation: 'Relación',
  assembly: 'Ensamblaje',
  piece: 'Pieza',
  quantityItem: 'Producto por cantidad',
  workOrder: 'Orden de trabajo',
  dismantling: 'Desmonte',
  dismantlingPending: 'Desmontes pendientes',
  missingLocation: 'Sin ubicación registrada',
  componentsPendingConfirm: 'Componentes pendientes de confirmar',
  receiptRecord: 'Registro inicial',
  receiptRecordCorrected: 'Registro inicial corregido',
  alerts: 'Alertas',
} as const;

/** Undo toasts for POS line removal and draft discard (UX 2.0 M6). */
export const UNDO_TOAST_DURATION_MS = 3000;

export function locationDisplay(value: string | undefined | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : UX_TERMS.missingLocation;
}
