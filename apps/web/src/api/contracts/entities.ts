export type Role = 'ADMINISTRATOR' | 'SELLER' | 'MECHANIC';

export type User = {
  id: string;
  name: string;
  username: string;
  /** Plain text only in local mock — never in production API. */
  password: string;
  role: Role;
  active: boolean;
  phone?: string;
  email?: string;
};

export type CommercialState = 'AVAILABLE' | 'SOLD';
export type PhysicalRelationship = 'INDEPENDENT' | 'INSTALLED';
export type ItemCondition = 'NEW' | 'USED' | 'REMANUFACTURED';

export type Item = {
  id: string;
  name: string;
  categoryId: string;
  brand?: string;
  model?: string;
  partNumber?: string;
  serial?: string;
  condition: ItemCondition;
  acquisitionCostDop?: number;
  costProvenance?: string;
  location?: string;
  notes?: string;
  commercialState: CommercialState;
  physicalRelationship: PhysicalRelationship;
  parentId?: string;
  complete: boolean;
  noDesarmar?: boolean;
  reservedByDraftId?: string;
  photos: string[];
  attributes?: Record<string, string>;
};

export type KnownMissingComponent = {
  id: string;
  parentId: string;
  expectedComponentName: string;
  origin: 'MISSING_AT_RECEIPT' | 'REMOVED_AFTER_BASELINE';
  /** Present when origin is REMOVED_AFTER_BASELINE — identity is not deleted. */
  formerItemId?: string;
  workOrderId?: string;
};

export type QtyProduct = {
  id: string;
  name: string;
  categoryId: string;
  brand?: string;
  onHand: number;
  reserved: number;
  unitCostDop: number;
  location?: string;
};

export type CustomerContact = {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  title?: string;
  isPrimary?: boolean;
};

export type Customer = {
  id: string;
  name: string;
  rnc?: string;
  address?: string;
  notes?: string;
  isDefault?: boolean;
  contacts: CustomerContact[];
};

export type Category = {
  id: string;
  name: string;
  isAssembly: boolean;
  expectedComponents?: string[];
};

export type Service = {
  id: string;
  name: string;
  active: boolean;
};

export type InvoiceStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED';
export type PaymentState = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
export type Currency = 'DOP' | 'USD';

export type LineType =
  | 'ITEM'
  | 'QTY'
  | 'GENERIC'
  | 'EXTERNAL'
  | 'SERVICE'
  | 'DELIVERY';

export type InvoiceLine = {
  id: string;
  type: LineType;
  description: string;
  itemId?: string;
  qtyProductId?: string;
  serviceId?: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  pricePending?: boolean;
  /** DOP cost copied at line creation so later inventory edits do not rewrite the sale. */
  acquisitionCostDop?: number;
};

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK';
export type PaymentKind = 'PAYMENT' | 'REFUND';

export type Payment = {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  createdAt: string;
  /** Omitted on seed receipts — treated as PAYMENT. */
  kind?: PaymentKind;
  actorId?: string;
  reference?: string;
  idempotencyKey?: string;
};

export type Invoice = {
  id: string;
  number?: string;
  status: InvoiceStatus;
  customerId: string;
  currency: Currency;
  fiscal: boolean;
  lines: InvoiceLine[];
  payments: Payment[];
  paymentState: PaymentState;
  createdAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  profitabilityUsd?: number | null;
  profitabilityPendingFx?: boolean;
  /** Frozen at confirmation so later customer edits cannot rewrite issued documents (CUST-003). */
  customerSnapshot?: {
    name: string;
    rnc?: string;
  };
};

export type WorkOrderType = 'DISMANTLING' | 'INSTALLATION';
export type WorkOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type WorkOrder = {
  id: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  pieceId: string;
  sourceParentId?: string;
  destinationParentId?: string;
  assignedMechanicId?: string;
  invoiceId?: string;
  notes?: string;
  beforePhotos: string[];
  afterPhotos: string[];
  createdAt: string;
};

export type AppEvent = {
  id: string;
  type: string;
  description: string;
  actorId?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

/** In-memory application state — mock persistence until HTTP repositories. */
export type AppState = {
  users: User[];
  items: Item[];
  knownMissing: KnownMissingComponent[];
  qtyProducts: QtyProduct[];
  customers: Customer[];
  categories: Category[];
  services: Service[];
  invoices: Invoice[];
  workOrders: WorkOrder[];
  events: AppEvent[];
  fxAvailable: boolean;
  fxRateDopPerUsd: number;
  facSeq: number;
};

export type Session = {
  userId: string;
  createdAt: string;
};

/** Mechanic-facing projection — no commercial fields (WM10). */
export type MechanicWorkOrderView = {
  id: string;
  type: WorkOrderType;
  status: WorkOrderStatus;
  pieceId: string;
  pieceName: string;
  sourceParentId?: string;
  destinationParentId?: string;
  effectiveLocation?: string;
  notes?: string;
  beforePhotos: string[];
  afterPhotos: string[];
};
