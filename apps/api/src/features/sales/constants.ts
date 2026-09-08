export const DEFAULT_DRAFT_CURRENCY = 'DOP' as const;
export const MISSING_GENERIC_CUSTOMER_MESSAGE = 'Cliente contado is not seeded';
export const FISCAL_IDENTITY_REQUIRED_MESSAGE =
  'A fiscal invoice requires a customer with RNC or Cédula';
export const DRAFT_ONLY_EDIT_MESSAGE = 'Only draft invoices can be edited';
export const DRAFT_ONLY_DISCARD_MESSAGE = 'Only draft invoices can be discarded';
export const DRAFT_META_REQUIRED_MESSAGE = 'At least one field is required';
export const UNSUPPORTED_INVENTORY_LINE_MESSAGE =
  'Inventory-backed lines are not available; this invoice cannot create, reserve, or consume stock';
export const UNSUPPORTED_LINE_TYPE_MESSAGE =
  'Only GENERIC, SERVICE, DELIVERY, and EXTERNAL draft lines are supported';
export const DUPLICATE_DELIVERY_LINE_MESSAGE = 'A draft can have at most one DELIVERY line';
export const INACTIVE_SERVICE_LINE_MESSAGE = 'Inactive catalog services cannot be added to a draft';
export const CATALOG_SERVICE_NOT_FOUND_MESSAGE = 'Catalog service not found';
export const LINE_NOT_FOUND_MESSAGE = 'Invoice line not found';
export const UNKNOWN_COST_AMOUNT_MESSAGE = 'UNKNOWN cost must not include an amount';
export const COST_AMOUNT_REQUIRED_MESSAGE =
  'Acquisition cost amount is required when provenance is not UNKNOWN';
export const EMPTY_DRAFT_CONFIRM_MESSAGE = 'Agregue al menos una línea';
export const DRAFT_ONLY_CONFIRM_MESSAGE = 'Solo se puede confirmar un borrador';
export const INVOICE_NUMBER_PREFIX = 'FAC-';
export const INVOICE_NUMBER_PAD_WIDTH = 6;

export function formatInvoiceNumber(sequenceValue: number): string {
  return `${INVOICE_NUMBER_PREFIX}${String(sequenceValue).padStart(INVOICE_NUMBER_PAD_WIDTH, '0')}`;
}
