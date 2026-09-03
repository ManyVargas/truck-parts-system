import type { LineType, PaymentMethod } from '../../api/contracts/entities';
import { UX_TERMS } from '../../shared/copy/glossary';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  CHECK: 'Cheque',
};

export const LINE_TYPE_LABELS: Record<LineType, string> = {
  ITEM: UX_TERMS.piece,
  QTY: UX_TERMS.quantityItem,
  GENERIC: 'Línea genérica',
  EXTERNAL: 'Compra externa',
  SERVICE: 'Servicio',
  DELIVERY: 'Envío',
};
