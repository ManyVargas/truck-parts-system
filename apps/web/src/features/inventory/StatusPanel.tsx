import type { ItemDetailView } from '../../api/contracts/inventory';
import {
  AssemblyKindChip,
  CommercialChip,
  CompleteChip,
  NoDesarmarChip,
  PhysicalWorkChip,
  RelationChip,
  ReservationChip,
} from '../../shared/domain';
import { Card, Info } from '../../shared/ui';

const CONDITION_LABEL: Record<ItemDetailView['condition'], string> = {
  NEW: 'Nuevo',
  USED: 'Usado',
  REMANUFACTURED: 'Remanufacturado',
};

export function StatusPanel({ detail }: { detail: ItemDetailView }) {
  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-navy">Estado</h2>
      <div className="mb-4 flex flex-wrap gap-1.5">
        <CommercialChip state={detail.commercialState} />
        <AssemblyKindChip isAssembly={detail.isAssembly} />
        <RelationChip relationship={detail.physicalRelationship} parentName={detail.parentName} />
        {detail.isAssembly && <CompleteChip complete={detail.complete} />}
        <PhysicalWorkChip
          type={detail.workOrders.find((order) => order.status === 'PENDING' || order.status === 'IN_PROGRESS')?.type}
          status={detail.workOrders.find((order) => order.status === 'PENDING' || order.status === 'IN_PROGRESS')?.status}
        />
        <ReservationChip reserved={detail.reserved} draftId={detail.reservedByDraftId} />
        <NoDesarmarChip active={detail.noDesarmar} rootId={detail.protectedRootId} />
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-navy-400">Condición</dt>
          <dd className="font-medium text-navy">{CONDITION_LABEL[detail.condition]}</dd>
        </div>
        <div>
          <dt className="text-navy-400">Ubicación efectiva</dt>
          <dd className="font-medium text-navy">{detail.effectiveLocation ?? 'Pendiente'}</dd>
        </div>
        {detail.ownLocation && detail.ownLocation !== detail.effectiveLocation && (
          <div>
            <dt className="text-navy-400">Ubicación propia</dt>
            <dd className="text-navy">{detail.ownLocation}</dd>
          </div>
        )}
        <div>
          <dt className="text-navy-400">Padre actual</dt>
          <dd className="text-navy">{detail.parentName ?? 'Ninguno (independiente)'}</dd>
        </div>
      </dl>
      {detail.formerInstallation && (
        <div className="mt-4">
          <Info tone="info" title="Historial físico">
            Estuvo instalado en {detail.formerInstallation.parentName} (
            {detail.formerInstallation.parentId}). El desarme no borra esa actividad
            {detail.formerInstallation.workOrderId
              ? ` · ${detail.formerInstallation.workOrderId}`
              : ''}
            .
          </Info>
        </div>
      )}
      {detail.soldInstalledChildren.length > 0 && (
        <div className="mt-4 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 text-sm text-navy">
          <p className="font-medium">Piezas vendidas aún instaladas</p>
          <p className="mt-1 text-navy-400">
            El ensamblaje sigue completo hasta que el mecánico termine el desarme. Si se cancela la
            factura antes, la pieza puede volver a disponible sin haber salido del padre.
          </p>
          <ul className="mt-2 list-disc pl-4">
            {detail.soldInstalledChildren.map((child) => (
              <li key={child.id}>
                {child.name} ({child.id}
                {child.workOrderId ? ` · ${child.workOrderId}` : ''})
              </li>
            ))}
          </ul>
        </div>
      )}
      {detail.pendingCatalogReviews.length > 0 && (
        <div className="mt-4 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 text-sm text-navy">
          <p className="font-medium">Componentes añadidos al catálogo</p>
          <ul className="mt-2 list-disc pl-4">
            {detail.pendingCatalogReviews.map((entry) => (
              <li key={entry.id}>
                {entry.kind === 'ALREADY_PRESENT'
                  ? `${entry.expectedComponentName} ya está en el árbol${
                      entry.matchedChildId
                        ? ` (${entry.matchedChildName ?? entry.matchedChildId})`
                        : ''
                    }`
                  : `${entry.expectedComponentName} (NA provisional hasta validar)`}
              </li>
            ))}
          </ul>
        </div>
      )}
      {detail.missingComponents.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="font-medium">Faltantes</p>
          <ul className="mt-1 list-disc pl-4">
            {detail.missingComponents.map((entry) => (
              <li key={entry.id}>
                {entry.expectedComponentName} ({entry.origin === 'MISSING_AT_RECEIPT' ? 'en recepción' : 'tras desarme'})
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
