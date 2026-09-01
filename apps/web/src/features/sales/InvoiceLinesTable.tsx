import type { InvoiceLineView } from '../../api/contracts/sales';
import type { Currency } from '../../api/contracts/entities';
import { money, Mono } from '../../shared/ui';
import { LINE_TYPE_LABELS } from './labels';

export type InvoiceLinesTableProps = {
  lines: InvoiceLineView[];
  currency: Currency;
  fiscal: boolean;
};

export function InvoiceLinesTable({ lines, currency, fiscal }: InvoiceLinesTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-navy-100 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-navy-100 bg-navy-50 text-navy-400">
          <tr>
            <th className="px-4 py-3 font-medium">Línea</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium text-right">Cant.</th>
            <th className="px-4 py-3 font-medium text-right">Precio final</th>
            <th className="px-4 py-3 font-medium text-right">Base</th>
            <th className="px-4 py-3 font-medium text-right">ITBIS</th>
            <th className="px-4 py-3 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-100">
          {lines.map((line) => (
            <tr key={line.id} className="text-navy">
              <td className="px-4 py-3">{line.description}</td>
              <td className="px-4 py-3 text-navy-400">{LINE_TYPE_LABELS[line.type]}</td>
              <td className="px-4 py-3 text-right font-mono">{line.quantity}</td>
              <td className="px-4 py-3 text-right font-mono">{money(line.unitPrice, currency)}</td>
              <td className="px-4 py-3 text-right font-mono">{money(line.base, currency)}</td>
              <td className="px-4 py-3 text-right font-mono">
                {fiscal ? money(line.itbis, currency) : '—'}
              </td>
              <td className="px-4 py-3 text-right font-mono">
                <Mono>{money(line.gross, currency)}</Mono>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
