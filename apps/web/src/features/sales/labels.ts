import type { LineType, PaymentMethod } from '../../api/contracts/entities';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  CHECK: 'Cheque',
};

export const LINE_TYPE_LABELS: Record<LineType, string> = {
  ITEM: 'Artículo',
  QTY: 'Cantidad',
  GENERIC: 'Genérica',
  EXTERNAL: 'Externa',
  SERVICE: 'Servicio',
  DELIVERY: 'Envío',
};
