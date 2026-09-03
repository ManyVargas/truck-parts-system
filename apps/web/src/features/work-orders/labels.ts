import type { WorkOrderStatus, WorkOrderType } from '../../api/contracts/entities';
import { UX_TERMS } from '../../shared/copy/glossary';

export const WORK_ORDER_TYPE_LABELS: Record<WorkOrderType, string> = {
  DISMANTLING: UX_TERMS.dismantling,
  INSTALLATION: 'Instalación',
};

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En proceso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};
