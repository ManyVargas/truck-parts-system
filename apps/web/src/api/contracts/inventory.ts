import type {
  AppEvent,
  CommercialState,
  ItemCondition,
  KnownMissingComponent,
  PhysicalRelationship,
  WorkOrder,
  WorkOrderType,
} from './entities';

export type InventoryKind = 'ITEM' | 'QTY';

export type InventoryListFilters = {
  query?: string;
  categoryId?: string;
  includeSold?: boolean;
};

export type DraftEligibility = {
  allowed: boolean;
  reason?: string;
};

export type InventoryListRow = {
  kind: InventoryKind;
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  brand?: string;
  partNumber?: string;
  serial?: string;
  effectiveLocation?: string;
  commercialState: CommercialState | 'UNAVAILABLE';
  physicalRelationship?: PhysicalRelationship;
  parentId?: string;
  parentName?: string;
  isAssembly?: boolean;
  complete?: boolean;
  reserved: boolean;
  reservedByDraftId?: string;
  noDesarmar: boolean;
  protectedRootId?: string;
  qtyOnHand?: number;
  qtyReserved?: number;
  qtyAvailable?: number;
};

export type HierarchyMissingSlot = {
  id: string;
  name: string;
  origin: KnownMissingComponent['origin'];
  formerItemId?: string;
  workOrderId?: string;
};

export type HierarchyActiveWork = {
  id: string;
  type: WorkOrder['type'];
  status: WorkOrder['status'];
};

export type HierarchyNode = {
  id: string;
  name: string;
  parentId?: string;
  parentName?: string;
  commercialState: CommercialState;
  physicalRelationship: PhysicalRelationship;
  isAssembly: boolean;
  complete?: boolean;
  noDesarmar: boolean;
  protectedRootId?: string;
  activeWork?: HierarchyActiveWork;
  missingSlots: HierarchyMissingSlot[];
  children: HierarchyNode[];
};

export type ItemDetailView = {
  kind: 'ITEM';
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  isAssembly: boolean;
  brand?: string;
  model?: string;
  partNumber?: string;
  serial?: string;
  condition: ItemCondition;
  notes?: string;
  attributes?: Record<string, string>;
  photos: string[];
  acquisitionCostDop?: number;
  costProvenance?: string;
  ownLocation?: string;
  effectiveLocation?: string;
  commercialState: CommercialState;
  physicalRelationship: PhysicalRelationship;
  parentId?: string;
  parentName?: string;
  complete?: boolean;
  reserved: boolean;
  reservedByDraftId?: string;
  noDesarmar: boolean;
  protectedRootId?: string;
  missingComponents: KnownMissingComponent[];
  soldInstalledChildren: { id: string; name: string; workOrderId?: string }[];
  formerInstallation?: { parentId: string; parentName: string; workOrderId?: string };
  ancestors: { id: string; name: string }[];
  tree: HierarchyNode;
  workOrders: WorkOrder[];
  events: AppEvent[];
  draftEligibility: DraftEligibility;
};

export type QtyProductDetailView = {
  kind: 'QTY';
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  brand?: string;
  location?: string;
  photos: string[];
  unitCostDop: number;
  onHand: number;
  reserved: number;
  availableToReserve: number;
  commercialState: CommercialState | 'UNAVAILABLE';
  draftEligibility: DraftEligibility;
};

export type InventoryDetail = ItemDetailView | QtyProductDetailView;

export type AddToDraftInput = {
  itemId?: string;
  qtyProductId?: string;
  quantity?: number;
};

export type AddToDraftResult = {
  draftId: string;
  alreadyInDraft: boolean;
};

export type NoDesarmarInput = {
  itemId: string;
  enabled: boolean;
};

export type CostCorrectionInput = {
  itemId: string;
  acquisitionCostDop?: number;
  /** `null` explicitly clears a previously recorded provenance. */
  costProvenance?: string | null;
  reason: string;
};

export type BaselineCorrectionInput = {
  itemId: string;
  reason: string;
  markNotApplicable: string[];
};

export type ManualWorkOrderInput = {
  pieceId: string;
  type: WorkOrderType;
  destinationParentId?: string;
  notes?: string;
};
