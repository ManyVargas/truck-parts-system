import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { WOStatusChip, WOTypeChip } from '../../shared/domain';
import { Card, Info, Mono, SectionTitle } from '../../shared/ui';
import { PageHeader } from '../../shared/layout/PageHeader';
import { WOAdminActions } from './WOAdminActions';
import { WorkOrderHistory } from './WorkOrderHistory';
import { useWorkOrderDetail } from './useWorkOrderDetail';

function PhotoList({ title, photos }: { title: string; photos: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-navy-400">{title}</p>
      {photos.length === 0 ? (
        <p className="mt-1 text-sm text-navy-400">Sin evidencia todavía</p>
      ) : (
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-navy">
          {photos.map((photo) => (
            <li key={photo}>
              <Mono>{photo}</Mono>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function WorkOrderDetailPage() {
  const { id } = useParams();
  const { result, createOptions, isMutating, reassign, cancel } = useWorkOrderDetail(id);
  const [actionError, setActionError] = useState<string | null>(null);

  if (result.status === 'error') {
    return (
      <Info tone="error" title="No se pudo cargar la orden de trabajo">
        {result.error.message}
      </Info>
    );
  }

  if (result.status === 'loading') {
    return (
      <p className="text-sm text-navy-400" aria-live="polite">
        Cargando orden…
      </p>
    );
  }

  const detail = result.detail;
  const originOrDestination =
    detail.type === 'DISMANTLING'
      ? detail.sourceParentId
        ? `${detail.sourceParentName ?? detail.sourceParentId} (${detail.sourceParentId})`
        : 'Sin origen registrado'
      : detail.destinationParentId
        ? `${detail.destinationParentName ?? detail.destinationParentId} (${detail.destinationParentId})`
        : 'Sin destino registrado';

  return (
    <>
      <PageHeader
        title={detail.id}
        description={`${detail.pieceName} · ${detail.pieceId}`}
        actions={
          <WOAdminActions
            detail={detail}
            mechanics={createOptions?.mechanics ?? []}
            isMutating={isMutating}
            error={actionError}
            onClearError={() => setActionError(null)}
            onReassign={async (input) => {
              const response = await reassign(input);
              if (!response.ok) {
                setActionError(response.error.message);
                return false;
              }
              setActionError(null);
              return true;
            }}
            onCancel={async (input) => {
              const response = await cancel(input);
              if (!response.ok) {
                setActionError(response.error.message);
                return false;
              }
              setActionError(null);
              return true;
            }}
          />
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <WOTypeChip type={detail.type} />
        <WOStatusChip status={detail.status} />
        <Link to="/work-orders" className="text-sm text-brand hover:underline">
          Volver al listado
        </Link>
      </div>

      {detail.cancelReason && (
        <div className="mb-6">
          <Info tone="warning" title="Motivo de cancelación">
            {detail.cancelReason}
          </Info>
        </div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-navy-400">
            {detail.type === 'DISMANTLING' ? 'Origen' : 'Destino'}
          </p>
          <p className="mt-1 text-sm text-navy">{originOrDestination}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-navy-400">Asignado</p>
          <p className="mt-1 text-sm text-navy">{detail.assignedMechanicName ?? 'Sin asignar'}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-navy-400">Factura</p>
          <p className="mt-1 text-sm text-navy">
            {detail.invoiceId ? (
              <Link to={`/sales/${detail.invoiceId}`} className="text-brand hover:underline">
                <Mono>{detail.invoiceNumber ?? detail.invoiceId}</Mono>
              </Link>
            ) : (
              'Sin factura'
            )}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-navy-400">Notas</p>
          <p className="mt-1 text-sm text-navy">{detail.notes || '—'}</p>
        </Card>
      </div>

      <section className="mb-8">
        <SectionTitle
          title="Evidencia"
          subtitle="Las fotos las carga el mecánico al completar. Aquí solo se consulta."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <PhotoList title="Antes" photos={detail.beforePhotos} />
          </Card>
          <Card>
            <PhotoList title="Después" photos={detail.afterPhotos} />
          </Card>
        </div>
      </section>

      <WorkOrderHistory events={detail.history} />
    </>
  );
}
