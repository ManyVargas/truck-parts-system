import type { LineType } from '../../api/contracts/entities';
import type { AppError } from '../../shared/auth/types';
import type { AppCapabilities } from '../../shared/config/capabilities';

/**
 * POS copy follows the active capabilities so Release 2 billing never
 * implies inventory reservation (Development Plan: no stock sync until Release 5).
 */
export function posDraftDescription(capabilities: AppCapabilities): string {
  if (capabilities.inventorySales || capabilities.quantitySales) {
    return 'Edite el borrador, asigne precios y confirme. Las piezas de inventario quedan reservadas hasta confirmar o descartar.';
  }

  return 'Edite el borrador, asigne precios y confirme la factura.';
}

export function posEmptyLinesMessage(capabilities: AppCapabilities): string {
  if (capabilities.inventorySales || capabilities.quantitySales) {
    return 'No hay líneas. Agregue inventario o una línea libre.';
  }

  return 'No hay líneas. Agregue mercancía, un servicio o una entrega.';
}

export function posAddLineReservationHint(type: LineType): string | null {
  if (type === 'ITEM') {
    return 'Al agregar, esta pieza queda reservada para este borrador hasta confirmar o descartar.';
  }

  if (type === 'QTY') {
    return 'Al agregar, esas unidades quedan reservadas para este borrador hasta confirmar o descartar.';
  }

  return null;
}

const SOLD_ITEM = /^(\S+) ya está vendido$/i;
const UNRESERVED_ITEM = /^(\S+) no está reservado por este borrador$/i;
const QTY_STOCK = /^Stock insuficiente para (\S+)$/i;
const HTTP_STATUS = /^HTTP\s+(\d+)/i;

/**
 * Maps repository/HTTP failures to what the seller should do next.
 * Does not change domain rules; only presentation.
 */
export function toPosUserMessage(error: AppError): string {
  const raw = error.message.trim();
  const http = HTTP_STATUS.exec(raw);

  if (http && (http[1] === '409' || error.code === 'CONFLICT')) {
    return 'La pieza ya no está disponible. Elimínala del borrador o selecciona otra.';
  }

  if (http) {
    return 'No se pudo completar la operación. Revisa las líneas e inténtalo de nuevo.';
  }

  const sold = SOLD_ITEM.exec(raw);
  if (sold) {
    return `La pieza ${sold[1]} ya no está disponible. Elimínala del borrador o selecciona otra.`;
  }

  const unreserved = UNRESERVED_ITEM.exec(raw);
  if (unreserved) {
    return `La pieza ${unreserved[1]} ya no está disponible. Elimínala del borrador o selecciona otra.`;
  }

  const qty = QTY_STOCK.exec(raw);
  if (qty) {
    return `Esa cantidad de ${qty[1]} ya no está disponible. Ajusta la línea o elige otro producto.`;
  }

  return raw;
}
