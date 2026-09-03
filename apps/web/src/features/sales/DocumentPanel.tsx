import { currencyLabel, Field, Info, Select } from '../../shared/ui';
import type { Currency } from '../../api/contracts/entities';
import type { PosDraftView } from '../../api/contracts/sales';

type DocumentPanelProps = {
  draft: PosDraftView;
  readOnly: boolean;
  isMutating: boolean;
  error: string | null;
  onCustomerChange: (customerId: string) => void;
  onCurrencyChange: (currency: Currency) => void;
  onFiscalChange: (fiscal: boolean) => void;
};

export function DocumentPanel({
  draft,
  readOnly,
  isMutating,
  error,
  onCustomerChange,
  onCurrencyChange,
  onFiscalChange,
}: DocumentPanelProps) {
  const fiscalLocked = draft.customerIsDefault || !draft.customerRnc;

  return (
    <section className="flex flex-col gap-4">
      {error && (
        <Info tone="error" title="No se pudo actualizar el documento">
          {error}
        </Info>
      )}
      <Field htmlFor="pos-customer" label="Cliente">
        <Select
          id="pos-customer"
          data-pos-field="customer"
          value={draft.customerId}
          disabled={readOnly || isMutating}
          onChange={(event) => onCustomerChange(event.target.value)}
        >
          {draft.customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
              {customer.isDefault ? ' (predeterminado)' : ''}
              {customer.rnc ? ` · ${customer.rnc}` : ''}
            </option>
          ))}
        </Select>
      </Field>
      <Field htmlFor="pos-currency" label="Moneda">
        <Select
          id="pos-currency"
          data-pos-field="currency"
          value={draft.currency}
          disabled={readOnly || isMutating}
          onChange={(event) => onCurrencyChange(event.target.value as Currency)}
        >
          <option value="DOP">{currencyLabel('DOP')}</option>
          <option value="USD">{currencyLabel('USD')}</option>
        </Select>
      </Field>
      <label className="flex items-start gap-2 text-sm text-navy">
        <input
          id="pos-fiscal"
          data-pos-field="fiscal"
          type="checkbox"
          className="mt-1"
          checked={draft.fiscal}
          disabled={readOnly || isMutating || (fiscalLocked && !draft.fiscal)}
          onChange={(event) => onFiscalChange(event.target.checked)}
        />
        <span>
          <span className="font-medium">Factura con comprobante fiscal</span>
          <span className="mt-0.5 block text-xs text-navy-400">
            Activa el impuesto ITBIS (18% incluido) en las líneas gravadas. Requiere cliente con RNC o cédula.
          </span>
        </span>
      </label>
    </section>
  );
}
