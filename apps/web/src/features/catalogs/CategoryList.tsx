import type { Category } from '../../api/contracts/entities';
import { Button, Empty, HoverRow, Mono, TableShell } from '../../shared/ui';

export type CategoryListProps = {
  rows: Category[];
  onEdit: (row: Category) => void;
};

export function CategoryList({ rows, onEdit }: CategoryListProps) {
  if (rows.length === 0) {
    return (
      <Empty
        title="No hay categorías"
        description="Cree una categoría para usarla en el registro de inventario."
      />
    );
  }

  return (
    <TableShell>
      <thead className="border-b border-navy-100 bg-navy-50 text-navy-400">
        <tr>
          <th className="px-4 py-3 font-medium">Nombre</th>
          <th className="px-4 py-3 font-medium">Tipo</th>
          <th className="px-4 py-3 font-medium">Componentes esperados</th>
          <th className="px-4 py-3 font-medium">
            <span className="sr-only">Acciones</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-navy-100">
        {rows.map((row) => (
          <HoverRow key={row.id}>
            <td className="px-4 py-3">
              <span className="font-medium">{row.name}</span>
              <Mono className="mt-0.5 block text-xs text-navy-400">{row.id}</Mono>
            </td>
            <td className="px-4 py-3 text-navy-400">
              {row.isAssembly ? 'Ensamblaje' : 'Pieza / cantidad'}
            </td>
            <td className="px-4 py-3 text-navy-400">
              {row.isAssembly ? (row.expectedComponents?.join(', ') ?? '—') : '—'}
            </td>
            <td className="px-4 py-3 text-right">
              <Button variant="secondary" size="sm" onClick={() => onEdit(row)}>
                Editar
              </Button>
            </td>
          </HoverRow>
        ))}
      </tbody>
    </TableShell>
  );
}
