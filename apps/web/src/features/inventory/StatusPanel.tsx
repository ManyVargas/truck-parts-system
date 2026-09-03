import type { ItemDetailView } from '../../api/contracts/inventory';
import { useAuth } from '../auth/useAuth';
import { can } from '../../shared/auth/policies';
import { locationDisplay, UX_TERMS } from '../../shared/copy/glossary';
import { InventoryStatusCluster, PhysicalWorkChip } from '../../shared/domain';
import { Card, Info } from '../../shared/ui';

const CONDITION_LABEL: Record<ItemDetailView['condition'], string> = {
  NEW: 'Nuevo',
  USED: 'Usado',
  REMANUFACTURED: 'Remanufacturado',
};

export function StatusPanel({ detail }: { detail: ItemDetailView }) {
  const { user } = useAuth();
  const canResolveCatalogReviews = can(user, 'inventory.admin');
  const activeWork = detail.workOrders.find(
    (order) => order.status === 'PENDING' || order.status === 'IN_PROGRESS',
  );

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-navy">Estado</h2>
      <InventoryStatusCluster
        commercialState={detail.commercialState}
        physicalRelationship={detail.physicalRelationship}
        parentName={detail.parentName}
        isAssembly={detail.isAssembly}
        complete={detail.isAssembly ? detail.complete : undefined}
        reserved={detail.reserved}
        reservedByDraftId={detail.reservedByDraftId}
        noDesarmar={detail.noDesarmar}
        protectedRootId={detail.protectedRootId}
        layout="panel"
        extra={
          activeWork ? (
            <PhysicalWorkChip type={activeWork.type} status={activeWork.status} />
          ) : undefined
        }
      />
      <dl className="mt-5 grid gap-3 border-t border-navy-100 pt-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-navy-400">Condición</dt>
          <dd className="font-medium text-navy">{CONDITION_LABEL[detail.condition]}</dd>
        </div>
        <div>
          <dt className="text-navy-400">Ubicación efectiva</dt>
          <dd className="font-medium text-navy">{locationDisplay(detail.effectiveLocation)}</dd>
        </div>
        {detail.ownLocation && detail.ownLocation !== detail.effectiveLocation && (
          <div>
            <dt className="text-navy-400">Ubicación propia</dt>
            <dd className="text-navy">{detail.ownLocation}</dd>
          </div>
        )}
      </dl>
      {detail.formerInstallation && (
        <div className="mt-4">
          <Info tone="info" title="Historial físico">
            Estuvo instalado en {detail.formerInstallation.parentName} (
            {detail.formerInstallation.parentId}). El {UX_TERMS.dismantling.toLowerCase()} no borra
            esa actividad
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
            El ensamblaje sigue completo hasta que el mecánico termine el{' '}
            {UX_TERMS.dismantling.toLowerCase()}. Si se cancela la factura antes, la pieza puede
            volver a disponible sin haber salido del padre.
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
          {!canResolveCatalogReviews && (
            <p className="mt-1 text-navy-400">
              Solo el administrador puede confirmar, registrar presente o marcar falta.
            </p>
          )}
          <ul className="mt-2 list-disc pl-4">
            {detail.pendingCatalogReviews.map((entry) => (
              <li key={entry.id}>
                {entry.kind === 'ALREADY_PRESENT'
                  ? `${entry.expectedComponentName} ya está en el árbol${
                      entry.matchedChildId
                        ? ` (${entry.matchedChildName ?? entry.matchedChildId})`
                        : ''
                    }`
                  : `${entry.expectedComponentName} (“no aplica” provisional hasta validar)`}
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
                {entry.expectedComponentName} (
                {entry.origin === 'MISSING_AT_RECEIPT'
                  ? 'en recepción'
                  : `tras ${UX_TERMS.dismantling.toLowerCase()}`}
                )
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
