import type { Result } from '../../shared/auth/types';
import type { CustomerListRow, SaveCustomerInput } from './customers';
import type { UpdateOwnProfileInput, UpdateOwnProfileResult } from './profile';
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
  RegisterAssemblyInput,
  RegisterAssemblyResult,
  RegisterItemInput,
  RegisterQtyProductInput,
} from './inventory';
import type {
  AddDraftLineInput,
  AddPaymentInput,
  CancelInvoiceInput,
  CorrectCurrencyInput,
  CreateDraftResult,
  InvoiceDetailView,
  PosDraftView,
  RemoveDraftLineInput,
  SalesListRow,
  SalesListTab,
  SetDraftLinePriceInput,
  SetDraftMetaInput,
} from './sales';
import type {
  AddWorkOrderPhotoInput,
  CancelWorkOrderInput,
  CompleteWorkOrderInput,
  CreateManualWorkOrderInput,
  ReassignWorkOrderInput,
  WorkOrderCreateOptions,
  WorkOrderDetailView,
  WorkOrderListRow,
  WorkOrderListTab,
} from './work-orders';
import type {
  AppEvent,
  Category,
  Customer,
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
  updateOwnProfile(input: UpdateOwnProfileInput): Promise<Result<UpdateOwnProfileResult>>;
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
  registerItem(input: RegisterItemInput): Promise<Result<Item>>;
  registerAssembly(input: RegisterAssemblyInput): Promise<Result<RegisterAssemblyResult>>;
  registerQtyProduct(input: RegisterQtyProductInput): Promise<Result<QtyProduct>>;
};

export type CustomerRepository = {
  list(): Promise<Result<CustomerListRow[]>>;
  search(query: string): Promise<Result<CustomerListRow[]>>;
  getById(id: string): Promise<Result<Customer>>;
  save(input: SaveCustomerInput): Promise<Result<Customer>>;
};

export type SalesRepository = {
  listInvoices(tab?: SalesListTab): Promise<Result<SalesListRow[]>>;
  getInvoice(id: string): Promise<Result<InvoiceDetailView>>;
  addPayment(input: AddPaymentInput): Promise<Result<InvoiceDetailView>>;
  cancelInvoice(input: CancelInvoiceInput): Promise<Result<InvoiceDetailView>>;
  correctCurrency(input: CorrectCurrencyInput): Promise<Result<InvoiceDetailView>>;
  createDraft(): Promise<Result<CreateDraftResult>>;
  getDraft(id: string): Promise<Result<PosDraftView>>;
  addLine(input: AddDraftLineInput): Promise<Result<PosDraftView>>;
  removeLine(input: RemoveDraftLineInput): Promise<Result<PosDraftView>>;
  setLinePrice(input: SetDraftLinePriceInput): Promise<Result<PosDraftView>>;
  setDraftMeta(input: SetDraftMetaInput): Promise<Result<PosDraftView>>;
  confirmInvoice(draftId: string): Promise<Result<PosDraftView>>;
  discardDraft(draftId: string): Promise<Result<void>>;
};

export type WorkOrderRepository = {
  list(tab?: WorkOrderListTab): Promise<Result<WorkOrderListRow[]>>;
  getById(id: string): Promise<Result<WorkOrderDetailView>>;
  listForMechanic(): Promise<Result<MechanicWorkOrderView[]>>;
  getForMechanic(id: string): Promise<Result<MechanicWorkOrderView>>;
  getCreateOptions(): Promise<Result<WorkOrderCreateOptions>>;
  createManual(input: CreateManualWorkOrderInput): Promise<Result<WorkOrderDetailView>>;
  reassign(input: ReassignWorkOrderInput): Promise<Result<WorkOrderDetailView>>;
  cancel(input: CancelWorkOrderInput): Promise<Result<WorkOrderDetailView>>;
  takeOrder(workOrderId: string): Promise<Result<MechanicWorkOrderView>>;
  addPhoto(input: AddWorkOrderPhotoInput): Promise<Result<MechanicWorkOrderView>>;
  completeDesarme(input: CompleteWorkOrderInput): Promise<Result<MechanicWorkOrderView>>;
  completeInstalacion(input: CompleteWorkOrderInput): Promise<Result<MechanicWorkOrderView>>;
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
