import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { CreateManualWorkOrderInput, WorkOrderListTab } from '../../api/contracts/work-orders';
import { Button, Info } from '../../shared/ui';
import { PageHeader } from '../../shared/layout/PageHeader';
import { TabBar } from '../../shared/layout/TabBar';
import { CreateWorkOrderModal } from './CreateWorkOrderModal';
import { WorkOrderTable } from './WorkOrderTable';
import { useWorkOrders } from './useWorkOrders';

const TABS: { id: WorkOrderListTab; label: string }[] = [
  { id: 'ALL', label: 'Todas' },
  { id: 'PENDING', label: 'Pendiente' },
  { id: 'IN_PROGRESS', label: 'En proceso' },
  { id: 'COMPLETED', label: 'Completada' },
  { id: 'CANCELLED', label: 'Cancelada' },
];

export function WorkOrdersPage() {
  const [tab, setTab] = useState<WorkOrderListTab>('ALL');
  const { result, createOptions, isMutating, createManual } = useWorkOrders(tab);
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function closeModal() {
    if (isMutating) {
      return;
    }
    setModalOpen(false);
    setFormError(null);
  }

  async function handleSubmit(input: CreateManualWorkOrderInput) {
    setFormError(null);
    const response = await createManual(input);
    if (!response.ok) {
      setFormError(response.error.message);
      return;
    }
    setModalOpen(false);
    navigate(`/work-orders/${response.value}`);
  }

  if (result.status === 'error') {
    return (
      <Info tone="error" title="No se pudo cargar las órdenes de trabajo">
        {result.error.message}
      </Info>
    );
  }

  return (
    <>
      <PageHeader
        title="Órdenes de Trabajo"
        description="Gestión administrativa de desarmes e instalaciones. Completar el trabajo físico corresponde al mecánico."
        actions={
          <Button
            onClick={() => {
              setFormError(null);
              setModalOpen(true);
            }}
            disabled={result.status === 'loading'}
          >
            Nueva OT
          </Button>
        }
      />

      <TabBar tabs={TABS} value={tab} onChange={setTab} />

      {result.status === 'loading' ? (
        <p className="text-sm text-navy-400" aria-live="polite">
          Cargando órdenes…
        </p>
      ) : (
        <WorkOrderTable rows={result.rows} />
      )}

      <CreateWorkOrderModal
        open={modalOpen}
        options={createOptions}
        isSaving={isMutating}
        error={formError}
        onClose={closeModal}
        onSubmit={(input) => {
          void handleSubmit(input);
        }}
      />
    </>
  );
}
