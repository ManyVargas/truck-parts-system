import type { Result } from '../../shared/auth/types';
import type {
  CancelWorkOrderInput,
  CreateManualWorkOrderInput,
  ReassignWorkOrderInput,
  WorkOrderCreateOptions,
  WorkOrderDetailView,
  WorkOrderListRow,
  WorkOrderListTab,
} from '../contracts/work-orders';
import type { MechanicWorkOrderView } from '../contracts/entities';

/**
 * Future HTTP work-order client.
 * Features consume WorkOrderRepository; this module is the swap target for MockWorkOrderRepository.
 */
export async function listWorkOrdersWithHttp(
  _tab?: WorkOrderListTab,
): Promise<Result<WorkOrderListRow[]>> {
  throw new Error('HttpWorkOrderRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function getWorkOrderWithHttp(_id: string): Promise<Result<WorkOrderDetailView>> {
  throw new Error('HttpWorkOrderRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function listMechanicWorkOrdersWithHttp(): Promise<Result<MechanicWorkOrderView[]>> {
  throw new Error('HttpWorkOrderRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function getWorkOrderCreateOptionsWithHttp(): Promise<Result<WorkOrderCreateOptions>> {
  throw new Error('HttpWorkOrderRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function createManualWorkOrderWithHttp(
  _input: CreateManualWorkOrderInput,
): Promise<Result<WorkOrderDetailView>> {
  throw new Error('HttpWorkOrderRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function reassignWorkOrderWithHttp(
  _input: ReassignWorkOrderInput,
): Promise<Result<WorkOrderDetailView>> {
  throw new Error('HttpWorkOrderRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}

export async function cancelWorkOrderWithHttp(
  _input: CancelWorkOrderInput,
): Promise<Result<WorkOrderDetailView>> {
  throw new Error('HttpWorkOrderRepository no implementado — use VITE_USE_MOCK_API=true (WM12)');
}
