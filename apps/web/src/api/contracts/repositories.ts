import type { Result } from '../../shared/auth/types';
import type { CustomerListRow, SaveCustomerInput } from './customers';
import type { DashboardSnapshot } from './dashboard';
import type {
  AddToDraftInput,
  AddToDraftResult,
  BaselineCorrectionInput,
  CostCorrectionInput,
  InventoryDetail,
  InventoryListFilters,
  InventoryListRow,
  ManualWorkOrderInput,
  NoDesarmarInput,
} from './inventory';
import type {
  AppEvent,
  Category,
  Customer,
  Invoice,
  Item,
  MechanicWorkOrderView,
  QtyProduct,
  Service,
  Session,
  User,
  WorkOrder,
} from './entities';

export type AuthRepository = {
  login(username: string, password: string): Promise<Result<Session>>;
  logout(): Promise<Result<void>>;
  getSession(): Promise<Result<Session | null>>;
  getCurrentUser(): Promise<Result<User | null>>;
};

export type UserRepository = {
  list(): Promise<Result<User[]>>;
  getById(id: string): Promise<Result<User>>;
  save(user: User): Promise<Result<User>>;
};

export type InventoryRepository = {
  listItems(): Promise<Result<Item[]>>;
  getItem(id: string): Promise<Result<Item>>;
  listQtyProducts(): Promise<Result<QtyProduct[]>>;
  getQtyProduct(id: string): Promise<Result<QtyProduct>>;
  listCatalog(filters?: InventoryListFilters): Promise<Result<InventoryListRow[]>>;
  getDetail(id: string): Promise<Result<InventoryDetail>>;
  addToDraft(input: AddToDraftInput): Promise<Result<AddToDraftResult>>;
  setNoDesarmar(input: NoDesarmarInput): Promise<Result<Item>>;
  correctAcquisitionCost(input: CostCorrectionInput): Promise<Result<Item>>;
  correctReceiptBaseline(input: BaselineCorrectionInput): Promise<Result<Item>>;
  createManualWorkOrder(input: ManualWorkOrderInput): Promise<Result<WorkOrder>>;
};

export type CustomerRepository = {
  list(): Promise<Result<CustomerListRow[]>>;
  search(query: string): Promise<Result<CustomerListRow[]>>;
  getById(id: string): Promise<Result<Customer>>;
  save(input: SaveCustomerInput): Promise<Result<Customer>>;
};

export type SalesRepository = {
  listInvoices(): Promise<Result<Invoice[]>>;
  getInvoice(id: string): Promise<Result<Invoice>>;
};

export type WorkOrderRepository = {
  list(): Promise<Result<WorkOrder[]>>;
  getById(id: string): Promise<Result<WorkOrder>>;
  listForMechanic(): Promise<Result<MechanicWorkOrderView[]>>;
};

export type CategoryRepository = {
  list(): Promise<Result<Category[]>>;
  save(category: Category): Promise<Result<Category>>;
};

export type ServiceRepository = {
  list(): Promise<Result<Service[]>>;
  save(service: Service): Promise<Result<Service>>;
};

export type EventRepository = {
  list(): Promise<Result<AppEvent[]>>;
};

export type DashboardRepository = {
  getSnapshot(): Promise<Result<DashboardSnapshot>>;
};
