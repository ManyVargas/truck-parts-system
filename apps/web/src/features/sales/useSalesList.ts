import { useCallback, useEffect, useState } from 'react';

import type { SalesListRow, SalesListTab } from '../../api/contracts/sales';
import type { AppError } from '../../shared/auth/types';
import { salesRepository } from '../../api/repositories';

export const SALES_LIST_TABS: SalesListTab[] = ['ALL', 'DRAFT', 'COMPLETED', 'CANCELLED'];

/** Matches dashboard invoicesToday (`DEMO_NOW_ISO` in the demo clock). */
const DEMO_TODAY = '2026-08-25';

export type SalesUrlFilters = {
  today: boolean;
  outstanding: boolean;
  payments: boolean;
};

/**
 * Calendar day of an ISO timestamp — same rule as invoice-money `utcCalendarDate`.
 */
function utcCalendarDate(iso: string): string {
  return iso.slice(0, 10);
}

function isFlagParam(value: string | null): boolean {
  return value === '1';
}

export function parseSalesListTab(value: string | null): SalesListTab | null {
  if (value && SALES_LIST_TABS.includes(value as SalesListTab)) {
    return value as SalesListTab;
  }
  return null;
}

export function parseSalesUrlFilters(params: URLSearchParams): SalesUrlFilters {
  return {
    today: isFlagParam(params.get('today')),
    outstanding: isFlagParam(params.get('outstanding')),
    payments: isFlagParam(params.get('payments')),
  };
}

export function salesUrlFiltersActive(filters: SalesUrlFilters): boolean {
  return filters.today || filters.outstanding || filters.payments;
}

/**
 * Extra list filters from dashboard KPI query params. Combined with the tab
 * (AND). “Today” is the demo calendar day so it matches invoicesToday on Inicio.
 */
export function applySalesUrlFilters(
  rows: SalesListRow[],
  filters: SalesUrlFilters,
  today: string = DEMO_TODAY,
): SalesListRow[] {
  if (!salesUrlFiltersActive(filters)) {
    return rows;
  }

  return rows.filter((row) => {
    if (filters.today) {
      if (
        row.status !== 'COMPLETED' ||
        row.confirmedAt == null ||
        utcCalendarDate(row.confirmedAt) !== today
      ) {
        return false;
      }
    }

    if (filters.outstanding && !(row.status === 'COMPLETED' && row.balance > 0)) {
      return false;
    }

    if (filters.payments && row.paymentState !== 'PAID' && row.paymentState !== 'PARTIALLY_PAID') {
      return false;
    }

    return true;
  });
}

type SalesQuery =
  | { status: 'loading' }
  | { status: 'error'; error: AppError }
  | { status: 'ready'; rows: SalesListRow[] };

export function useSalesList(tab: SalesListTab) {
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState<SalesQuery>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setResult({ status: 'loading' });

    salesRepository.listInvoices(tab).then((response) => {
      if (cancelled) {
        return;
      }

      if (!response.ok) {
        setResult({ status: 'error', error: response.error });
        return;
      }

      setResult({ status: 'ready', rows: response.value });
    });

    return () => {
      cancelled = true;
    };
  }, [tab, reloadToken]);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return { result, reload };
}
