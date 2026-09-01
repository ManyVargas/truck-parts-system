import { DEFAULT_CASH_CUSTOMER_ID, type CustomerListRow } from '../../api/contracts/customers';
import type { CustomerContact } from '../../api/contracts/entities';
import { Button, Chip, Empty, Mono } from '../../shared/ui';

function primaryContact(contacts: CustomerContact[]): CustomerContact | undefined {
  return contacts.find((contact) => contact.isPrimary) ?? contacts[0];
}

export type CustomerTableProps = {
  rows: CustomerListRow[];
  onEdit: (row: CustomerListRow) => void;
};

export function CustomerTable({ rows, onEdit }: CustomerTableProps) {
  if (rows.length === 0) {
    return (
      <Empty
        title="No hay clientes"
        description="Pruebe otra búsqueda o cree un cliente nuevo."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-navy-100 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-navy-100 bg-navy-50 text-navy-400">
          <tr>
            <th className="px-4 py-3 font-medium">Nombre</th>
            <th className="px-4 py-3 font-medium">RNC / Cédula</th>
            <th className="px-4 py-3 font-medium">Teléfono</th>
            <th className="px-4 py-3 font-medium">Facturas</th>
            <th className="px-4 py-3 font-medium">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-100">
          {rows.map((row) => {
            const isDefault = row.id === DEFAULT_CASH_CUSTOMER_ID || row.isDefault === true;
            const primary = primaryContact(row.contacts);

            return (
              <tr key={row.id} className="text-navy">
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{row.name}</span>
                    {isDefault && <Chip tone="brand">Predeterminado</Chip>}
                  </div>
                  <Mono className="mt-0.5 text-xs text-navy-400">{row.id}</Mono>
                </td>
                <td className="px-4 py-3 text-navy-400">{row.rnc ?? '—'}</td>
                <td className="px-4 py-3 text-navy-400">
                  {primary?.phone ?? '—'}
                  {row.contacts.length > 1 && (
                    <span className="mt-0.5 block text-xs text-navy-300">
                      {row.contacts.length} contactos
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono">{row.invoiceCount}</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isDefault}
                    title={isDefault ? 'Cliente Contado no se puede editar' : 'Editar cliente'}
                    onClick={() => onEdit(row)}
                  >
                    Editar
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
