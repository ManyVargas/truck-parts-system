import type { WorkOrderStatus, WorkOrderType } from '../../api/contracts/entities';

export const WORK_ORDER_TYPE_LABELS: Record<WorkOrderType, string> = {
  DISMANTLING: 'Desarme',
  INSTALLATION: 'Instalación',
};

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En proceso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};
