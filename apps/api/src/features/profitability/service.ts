import { AppError } from '../../infrastructure/errors/app-error.js';
import { calculatedCompletedProfitability, roundMoney } from '../sales/money/index.js';
import { PROFITABILITY_REASONS } from '../sales/money/types.js';
import { toManualGrossProfitHistorySnapshot, toPublicInvoice } from '../sales/projection.js';
import { salesTransaction, type SalesTransaction } from '../sales/transaction.js';
import { assertAdministrator } from '../users/policies.js';
import {
  CALCULATED_PROFIT_EXISTS_MESSAGE,
  COMPLETED_ONLY_MANUAL_PROFIT_MESSAGE,
  PENDING_FX_MANUAL_PROFIT_MESSAGE,
} from './constants.js';
import { profitabilityInvoiceIdSchema, recordManualGrossProfitSchema } from './validation.js';

export class ProfitabilityService {
  constructor(private readonly transaction: SalesTransaction = salesTransaction) {}

  async recordManualGrossProfit(actorId: string, invoiceId: string, input: unknown) {
    profitabilityInvoiceIdSchema.parse({ invoiceId });
    const body = recordManualGrossProfitSchema.parse(input);
    const profitDop = roundMoney(body.profitDop);

    return this.transaction(async ({ sales, users, history }) => {
      const actor = await users.findById(actorId);
      assertAdministrator(actor);

      await sales.lockById(invoiceId);
      const existing = await sales.findById(invoiceId);
      if (!existing) throw AppError.notFound('Invoice not found');

      const calculated = calculatedCompletedProfitability({
        status: existing.status,
        currency: existing.currency,
        fiscal: existing.fiscal,
        lines: existing.lines.map((line) => ({
          type: line.type,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          gross: line.gross,
          acquisitionCostDop: line.acquisitionCostDop,
          costProvenance: line.costProvenance,
        })),
        exchangeRateDopPerUsd: existing.exchangeRateDopPerUsd,
      });
      if (calculated == null) throw AppError.conflict(COMPLETED_ONLY_MANUAL_PROFIT_MESSAGE);
      if (calculated.reason === PROFITABILITY_REASONS.PENDING_FX_RATE) {
        throw AppError.conflict(PENDING_FX_MANUAL_PROFIT_MESSAGE);
      }
      if (calculated.status !== 'UNAVAILABLE') {
        throw AppError.conflict(CALCULATED_PROFIT_EXISTS_MESSAGE);
      }

      const updated = await sales.recordManualGrossProfit({
        id: invoiceId,
        profitDop,
        recordedAt: new Date(),
      });
      await history.append({
        actor: { actorType: 'USER', actorUserId: actorId },
        subjectType: 'INVOICE',
        subjectId: invoiceId,
        eventType: 'INVOICE_GROSS_PROFIT_RECORDED',
        payload: toManualGrossProfitHistorySnapshot(existing.manualGrossProfitDop, profitDop),
      });
      return toPublicInvoice(updated, actor!);
    });
  }
}

export const profitabilityService = new ProfitabilityService();
