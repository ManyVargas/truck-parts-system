import { money } from '../../shared/ui';
import type { Currency } from '../../api/contracts/entities';
import type { PosDraftTotals } from '../../api/contracts/sales';

type TotalsPanelProps = {
  totals: PosDraftTotals;
  currency: Currency;
  fiscal: boolean;
};

export function TotalsPanel({ totals, currency, fiscal }: TotalsPanelProps) {
  return (
    <dl className="grid gap-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-navy-400">Líneas</dt>
        <dd className="font-medium text-navy">{totals.lineCount}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-navy-400">Base imponible</dt>
        <dd className="font-medium text-navy">{money(totals.taxableBase, currency)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-navy-400">ITBIS {fiscal ? '18% incluido' : ''}</dt>
        <dd className="font-medium text-navy" data-testid="pos-itbis">
          {money(totals.itbis, currency)}
        </dd>
      </div>
      <div className="flex justify-between border-t border-navy-100 pt-2 text-base">
        <dt className="font-semibold text-navy">Total</dt>
        <dd className="font-semibold text-navy">{money(totals.gross, currency)}</dd>
      </div>
    </dl>
  );
}
