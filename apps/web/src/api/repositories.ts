/**
 * Composition root: features import repositories from here, never from mocks/.
 *
 * Vite inlines `import.meta.env.VITE_USE_MOCK_API`. Default is mock (`!== 'false'`).
 * With VITE_USE_MOCK_API=false the HTTP stubs boot without calling mock services.
 */
import { useMockApi } from './client/http-client';
import {
  httpAuthRepository,
  httpCategoryRepository,
  httpCustomerRepository,
  httpDashboardRepository,
  httpInventoryRepository,
  httpProfitabilityRepository,
  httpRecoveryRepository,
  httpSalesRepository,
  httpServiceRepository,
  httpUserRepository,
  httpWorkOrderRepository,
} from './http/repositories';
import {
  mockAuthRepository,
  mockCategoryRepository,
  mockCustomerRepository,
  mockDashboardRepository,
  mockInventoryRepository,
  mockProfitabilityRepository,
  mockRecoveryRepository,
  mockSalesRepository,
  mockServiceRepository,
  mockUserRepository,
  mockWorkOrderRepository,
} from '../mocks/repositories';

export const authRepository = useMockApi ? mockAuthRepository : httpAuthRepository;
export const userRepository = useMockApi ? mockUserRepository : httpUserRepository;
export const inventoryRepository = useMockApi ? mockInventoryRepository : httpInventoryRepository;
export const customerRepository = useMockApi ? mockCustomerRepository : httpCustomerRepository;
export const salesRepository = useMockApi ? mockSalesRepository : httpSalesRepository;
export const workOrderRepository = useMockApi ? mockWorkOrderRepository : httpWorkOrderRepository;
export const categoryRepository = useMockApi ? mockCategoryRepository : httpCategoryRepository;
export const serviceRepository = useMockApi ? mockServiceRepository : httpServiceRepository;
export const dashboardRepository = useMockApi ? mockDashboardRepository : httpDashboardRepository;
export const profitabilityRepository = useMockApi
  ? mockProfitabilityRepository
  : httpProfitabilityRepository;
export const recoveryRepository = useMockApi ? mockRecoveryRepository : httpRecoveryRepository;
