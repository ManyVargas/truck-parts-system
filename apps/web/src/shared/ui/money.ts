const DOP_FORMATTER = new Intl.NumberFormat('es-DO', {
  style: 'currency',
  currency: 'DOP',
  minimumFractionDigits: 2,
});

const USD_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

export type MoneyCurrency = 'DOP' | 'USD';

/** Formats monetary values for display — business rounding lives in mock services. */
export function money(amount: number, currency: MoneyCurrency = 'DOP'): string {
  return currency === 'USD' ? USD_FORMATTER.format(amount) : DOP_FORMATTER.format(amount);
}

/** Human-readable currency name for selects and labels; ISO code stays in parentheses. */
export function currencyLabel(currency: MoneyCurrency): string {
  return currency === 'USD' ? 'Dólares (USD)' : 'Pesos (DOP)';
}
