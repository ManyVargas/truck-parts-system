import type { WorkOrder, WorkOrderStatus, WorkOrderType } from './entities';
import type { ManualWorkOrderInput } from './inventory';

export type WorkOrderListTab = 'ALL' | WorkOrderStatus;

export type WorkOrderListRow = {
  id: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  pieceId: string;
  pieceName: string;
  sourceParentId?: string;
  sourceParentName?: string;
  destinationParentId?: string;
  destinationParentName?: string;
  assignedMechanicId?: string;
  assignedMechanicName?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  createdAt: string;
  href: string;
};

export type WorkOrderHistoryEntry = {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  actorName?: string;
};

export type WorkOrderDetailActions = {
  canReassign: boolean;
  canCancel: boolean;
};

export type WorkOrderDetailView = WorkOrderListRow & {
  notes?: string;
  beforePhotos: string[];
  afterPhotos: string[];
  cancelReason?: string;
  history: WorkOrderHistoryEntry[];
  actions: WorkOrderDetailActions;
};

export type WorkOrderPieceOption = {
  id: string;
  name: string;
  parentId?: string;
};

export type WorkOrderMechanicOption = {
  id: string;
  name: string;
};

export type WorkOrderCreateOptions = {
  dismantlingPieces: WorkOrderPieceOption[];
  installationPieces: WorkOrderPieceOption[];
  destinations: WorkOrderPieceOption[];
  mechanics: WorkOrderMechanicOption[];
};

export type ReassignWorkOrderInput = {
  workOrderId: string;
  mechanicId: string;
  reason: string;
};

export type CancelWorkOrderInput = {
  workOrderId: string;
  reason: string;
  physicalVerified?: boolean;
};

export type CreateManualWorkOrderInput = ManualWorkOrderInput;

export type { WorkOrder, WorkOrderStatus, WorkOrderType };
