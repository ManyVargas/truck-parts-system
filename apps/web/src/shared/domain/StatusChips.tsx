import { Chip } from '../ui';

export function CommercialChip({
  state,
}: {
  state: 'AVAILABLE' | 'SOLD' | 'UNAVAILABLE';
}) {
  if (state === 'SOLD') {
    return <Chip tone="danger">Vendido</Chip>;
  }
  if (state === 'UNAVAILABLE') {
    return <Chip tone="neutral">No disponible</Chip>;
  }
  return <Chip tone="success">Disponible</Chip>;
}

export function RelationChip({
  relationship,
  parentName,
}: {
  relationship?: 'INDEPENDENT' | 'INSTALLED';
  parentName?: string;
}) {
  if (!relationship) {
    return <Chip tone="neutral">Por cantidad</Chip>;
  }

  if (relationship === 'INSTALLED') {
    return (
      <Chip tone="brand">{parentName ? `Instalado en ${parentName}` : 'Instalado'}</Chip>
    );
  }

  return <Chip tone="neutral">Independiente</Chip>;
}

export function PhysicalWorkChip({
  type,
  status,
}: {
  type?: 'DISMANTLING' | 'INSTALLATION';
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}) {
  if (!type || (status !== 'PENDING' && status !== 'IN_PROGRESS')) {
    return null;
  }

  const action = type === 'DISMANTLING' ? 'Desarme' : 'Instalación';
  const phase = status === 'IN_PROGRESS' ? 'en proceso' : 'pendiente';

  return <Chip tone="amber">{`${action} ${phase}`}</Chip>;
}

export function AssemblyKindChip({ isAssembly }: { isAssembly?: boolean }) {
  if (!isAssembly) {
    return <Chip tone="neutral">Pieza</Chip>;
  }

  return <Chip tone="brand">Ensamblaje</Chip>;
}

export function CompleteChip({ complete }: { complete?: boolean }) {
  if (complete == null) {
    return null;
  }

  return complete ? (
    <Chip tone="success">Completo</Chip>
  ) : (
    <Chip tone="amber">Incompleto</Chip>
  );
}

export function ReservationChip({
  reserved,
  draftId,
}: {
  reserved: boolean;
  draftId?: string;
}) {
  if (!reserved) {
    return null;
  }

  return <Chip tone="amber">{draftId ? `Reservado (${draftId})` : 'Reservado'}</Chip>;
}

export function NoDesarmarChip({
  active,
  rootId,
}: {
  active: boolean;
  rootId?: string;
}) {
  if (!active) {
    return null;
  }

  return (
    <Chip tone="danger">
      {rootId && rootId.length > 0 ? `No desarmar · ${rootId}` : 'No desarmar'}
    </Chip>
  );
}

export function InvoiceStatusChip({
  status,
}: {
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
}) {
  if (status === 'DRAFT') {
    return <Chip tone="amber">Borrador</Chip>;
  }
  if (status === 'CANCELLED') {
    return <Chip tone="danger">Cancelada</Chip>;
  }
  return <Chip tone="success">Completada</Chip>;
}

export function PaymentChip({
  state,
}: {
  state: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
}) {
  if (state === 'PAID') {
    return <Chip tone="success">Pagada</Chip>;
  }
  if (state === 'PARTIALLY_PAID') {
    return <Chip tone="amber">Parcial</Chip>;
  }
  return <Chip tone="danger">Sin pagar</Chip>;
}
