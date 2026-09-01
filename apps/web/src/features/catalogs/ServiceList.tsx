import type { Service } from '../../api/contracts/entities';
import { Button, Chip, Empty, Mono } from '../../shared/ui';

export type ServiceListProps = {
  rows: Service[];
  onEdit: (row: Service) => void;
  onToggleActive: (row: Service) => void;
  togglingId: string | null;
};

export function ServiceList({ rows, onEdit, onToggleActive, togglingId }: ServiceListProps) {
  if (rows.length === 0) {
    return (
      <Empty
        title="No hay servicios"
        description="Agregue un servicio mecánico para ofrecerlo en el punto de venta."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-navy-100 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-navy-100 bg-navy-50 text-navy-400">
          <tr>
            <th className="px-4 py-3 font-medium">Nombre</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-100">
          {rows.map((row) => (
            <tr key={row.id} className="text-navy">
              <td className="px-4 py-3">
                <span className="font-medium">{row.name}</span>
                <Mono className="mt-0.5 block text-xs text-navy-400">{row.id}</Mono>
              </td>
              <td className="px-4 py-3">
                {row.active ? <Chip tone="success">Activo</Chip> : <Chip>Inactivo</Chip>}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={togglingId === row.id}
                    onClick={() => onToggleActive(row)}
                  >
                    {row.active ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => onEdit(row)}>
                    Editar
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
