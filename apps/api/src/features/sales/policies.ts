import type { InvoiceLineType, Role } from '@prisma/client';

import { AppError } from '../../infrastructure/errors/app-error.js';
import { UNSUPPORTED_INVENTORY_LINE_MESSAGE, UNSUPPORTED_LINE_TYPE_MESSAGE } from './constants.js';

const INVOICE_MANAGER_ROLES: ReadonlySet<Role> = new Set(['ADMINISTRATOR', 'SELLER']);
const INVENTORY_LINE_TYPES = new Set<InvoiceLineType>(['ITEM', 'QTY']);
const ENABLED_DRAFT_LINE_TYPES = new Set<InvoiceLineType>(['GENERIC']);

export function assertInvoiceManager(
  user: { active: boolean; role: Role; mustChangePassword: boolean } | null,
): void {
  if (!user?.active) throw AppError.unauthorized();
  if (user.mustChangePassword) {
    throw new AppError('FORBIDDEN', 'Password change required', {
      reason: 'PASSWORD_CHANGE_REQUIRED',
    });
  }
  if (!INVOICE_MANAGER_ROLES.has(user.role)) throw AppError.forbidden();
}

export function assertDraftLineTypeEnabled(type: InvoiceLineType): void {
  if (INVENTORY_LINE_TYPES.has(type)) {
    throw AppError.conflict(UNSUPPORTED_INVENTORY_LINE_MESSAGE, { type });
  }
  if (!ENABLED_DRAFT_LINE_TYPES.has(type)) {
    throw AppError.conflict(UNSUPPORTED_LINE_TYPE_MESSAGE, { type });
  }
}
