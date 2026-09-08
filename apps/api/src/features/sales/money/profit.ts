import { Prisma } from '@prisma/client';

import { calculateLineMoney } from './line.js';
import { roundMoney } from './round.js';
import {
  PROFITABILITY_REASONS,
  type InvoiceLineType,
  type LineProfitInput,
  type Profitability,
} from './types.js';

const NO_COGS_LINE_TYPES = new Set<InvoiceLineType>(['SERVICE', 'DELIVERY']);

const UNAVAILABLE_UNKNOWN_COST: Profitability = {
  status: 'UNAVAILABLE',
  reason: PROFITABILITY_REASONS.UNKNOWN_COST,
  profitDop: null,
  margin: null,
};

const UNAVAILABLE_PENDING_FX: Profitability = {
  status: 'UNAVAILABLE',
  reason: PROFITABILITY_REASONS.PENDING_FX_RATE,
  profitDop: null,
  margin: null,
};

function percentOf(profit: Prisma.Decimal, sellingPrice: Prisma.Decimal): Prisma.Decimal | null {
  if (sellingPrice.isZero()) return null;
  return roundMoney(profit.div(sellingPrice).times(100));
}

function calculated(profit: Prisma.Decimal, sellingPrice: Prisma.Decimal): Profitability {
  return {
    status: 'CALCULATED',
    reason: null,
    profitDop: roundMoney(profit),
    margin: percentOf(profit, sellingPrice),
  };
}

export function sellingPriceOf(line: LineProfitInput, fiscal: boolean): Prisma.Decimal {
  if (line.gross != null) return line.gross;
  return calculateLineMoney({
    type: line.type,
    unitPrice: line.unitPrice,
    quantity: line.quantity,
    fiscal,
  }).gross;
}

/**
 * Gross profit in DOP: selling price (line gross) minus known acquisition cost.
 * SERVICE/DELIVERY have no COGS, so the selling price is the profit.
 * UNKNOWN cost is never treated as zero.
 */
export function calculateLineProfitDop(line: LineProfitInput, fiscal: boolean): Profitability {
  const sellingPrice = sellingPriceOf(line, fiscal);

  if (NO_COGS_LINE_TYPES.has(line.type)) {
    return calculated(sellingPrice, sellingPrice);
  }

  if (line.costProvenance === 'UNKNOWN' || line.acquisitionCostDop == null) {
    return UNAVAILABLE_UNKNOWN_COST;
  }

  return calculated(sellingPrice.minus(line.acquisitionCostDop), sellingPrice);
}

export function pendingFxProfitability(): Profitability {
  return UNAVAILABLE_PENDING_FX;
}

export function sumCalculatedProfit(
  lines: readonly { profitability: Profitability; sellingPrice: Prisma.Decimal }[],
): Profitability {
  // A partial subtotal would misrepresent the profitability of the complete sale.
  const unavailableLine = lines.find((line) => line.profitability.status === 'UNAVAILABLE');
  if (unavailableLine) return unavailableLine.profitability;

  const calculatedLines = lines.filter(
    (line) => line.profitability.status === 'CALCULATED' && line.profitability.profitDop != null,
  );
  if (calculatedLines.length === 0) return UNAVAILABLE_UNKNOWN_COST;

  const profitDop = calculatedLines.reduce(
    (total, line) => total.plus(line.profitability.profitDop as Prisma.Decimal),
    new Prisma.Decimal(0),
  );
  const sellingPrice = calculatedLines.reduce(
    (total, line) => total.plus(line.sellingPrice),
    new Prisma.Decimal(0),
  );
  return calculated(profitDop, sellingPrice);
}
