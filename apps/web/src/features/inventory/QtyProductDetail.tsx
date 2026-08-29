import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import type { QtyProductDetailView } from '../../api/contracts/inventory';
import { CommercialChip, ReservationChip } from '../../shared/domain';
import { Card, Mono, SectionTitle, money } from '../../shared/ui';
import { PhotoGrid } from './PhotoGrid';

export function QtyProductDetail({
  detail,
  actions,
}: {
  detail: QtyProductDetailView;
  actions: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-navy-400">
            <Link to="/inventory" className="text-brand hover:underline">
              Inventario
            </Link>
            {' / '}
            <Mono>{detail.id}</Mono>
          </p>
          <h1 className="mt-1 text-3xl font-bold text-navy">{detail.name}</h1>
          <p className="mt-1 text-navy-400">
            Producto por cantidad · {detail.categoryName}
            {detail.brand ? ` · ${detail.brand}` : ''}
          </p>
        </div>
        {actions}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Existencia" />
          <div className="mb-4 flex flex-wrap gap-1.5">
            <CommercialChip state={detail.commercialState} />
            <ReservationChip reserved={detail.reserved > 0} />
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-navy-400">En existencia</dt>
              <dd className="font-mono text-lg text-navy">{detail.onHand}</dd>
            </div>
            <div>
              <dt className="text-navy-400">Reservado</dt>
              <dd className="font-mono text-lg text-navy">{detail.reserved}</dd>
            </div>
            <div>
              <dt className="text-navy-400">Disponible</dt>
              <dd className="font-mono text-lg text-navy">{detail.availableToReserve}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-navy-400">disponible = existencia − reservado</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-navy-400">Ubicación</dt>
              <dd>{detail.location ?? 'Pendiente'}</dd>
            </div>
            <div>
              <dt className="text-navy-400">Costo unitario promedio</dt>
              <dd className="font-mono">{money(detail.unitCostDop)}</dd>
            </div>
          </dl>
        </Card>
        <PhotoGrid photos={detail.photos} />
      </div>
    </div>
  );
}
