import type {
  AuthRepository,
  CategoryRepository,
  CustomerRepository,
  DashboardRepository,
  EventRepository,
  InventoryRepository,
  ProfitabilityRepository,
  RecoveryRepository,
  SalesRepository,
  ServiceRepository,
  UserRepository,
  WorkOrderRepository,
} from '../contracts/repositories';
import type { ConfirmInvoicePayment } from '../contracts/sales';
import { ok } from '../../shared/auth/types';
import { httpNotImplemented } from '../client/http-not-implemented';

/**
 * HTTP repository stubs selected when VITE_USE_MOCK_API=false.
 * getSession/getCurrentUser resolve empty so the app can boot to /login.
 * Other methods return a typed INTERNAL result until the matching API exists.
 */
export class HttpAuthRepository implements AuthRepository {
  async login() {
    return httpNotImplemented('HttpAuthRepository', 'login');
  }

  async logout() {
    return httpNotImplemented('HttpAuthRepository', 'logout');
  }

  async getSession() {
    return ok(null);
  }

  async getCurrentUser() {
    return ok(null);
  }

  async updateOwnProfile() {
    return httpNotImplemented('HttpAuthRepository', 'updateOwnProfile');
  }
}

export class HttpUserRepository implements UserRepository {
  async list() {
    return httpNotImplemented('HttpUserRepository', 'list');
  }

  async getById() {
    return httpNotImplemented('HttpUserRepository', 'getById');
  }

  async save() {
    return httpNotImplemented('HttpUserRepository', 'save');
  }
}

export class HttpInventoryRepository implements InventoryRepository {
  async listItems() {
    return httpNotImplemented('HttpInventoryRepository', 'listItems');
  }

  async getItem() {
    return httpNotImplemented('HttpInventoryRepository', 'getItem');
  }

  async listQtyProducts() {
    return httpNotImplemented('HttpInventoryRepository', 'listQtyProducts');
  }

  async getQtyProduct() {
    return httpNotImplemented('HttpInventoryRepository', 'getQtyProduct');
  }

  async listCatalog() {
    return httpNotImplemented('HttpInventoryRepository', 'listCatalog');
  }

  async getDetail() {
    return httpNotImplemented('HttpInventoryRepository', 'getDetail');
  }

  async addToDraft() {
    return httpNotImplemented('HttpInventoryRepository', 'addToDraft');
  }

  async setNoDesarmar() {
    return httpNotImplemented('HttpInventoryRepository', 'setNoDesarmar');
  }

  async correctAcquisitionCost() {
    return httpNotImplemented('HttpInventoryRepository', 'correctAcquisitionCost');
  }

  async correctReceiptBaseline() {
    return httpNotImplemented('HttpInventoryRepository', 'correctReceiptBaseline');
  }

  async resolveCatalogReview() {
    return httpNotImplemented('HttpInventoryRepository', 'resolveCatalogReview');
  }

  async createManualWorkOrder() {
    return httpNotImplemented('HttpInventoryRepository', 'createManualWorkOrder');
  }

  async registerItem() {
    return httpNotImplemented('HttpInventoryRepository', 'registerItem');
  }

  async registerAssembly() {
    return httpNotImplemented('HttpInventoryRepository', 'registerAssembly');
  }

  async registerQtyProduct() {
    return httpNotImplemented('HttpInventoryRepository', 'registerQtyProduct');
  }

  async receiveQtyStock() {
    return httpNotImplemented('HttpInventoryRepository', 'receiveQtyStock');
  }

  async adjustQtyStock() {
    return httpNotImplemented('HttpInventoryRepository', 'adjustQtyStock');
  }
}

export class HttpCustomerRepository implements CustomerRepository {
  async list() {
    return httpNotImplemented('HttpCustomerRepository', 'list');
  }

  async search() {
    return httpNotImplemented('HttpCustomerRepository', 'search');
  }

  async getById() {
    return httpNotImplemented('HttpCustomerRepository', 'getById');
  }

  async save() {
    return httpNotImplemented('HttpCustomerRepository', 'save');
  }
}

export class HttpSalesRepository implements SalesRepository {
  async listInvoices() {
    return httpNotImplemented('HttpSalesRepository', 'listInvoices');
  }

  async getInvoice() {
    return httpNotImplemented('HttpSalesRepository', 'getInvoice');
  }

  async addPayment() {
    return httpNotImplemented('HttpSalesRepository', 'addPayment');
  }

  async cancelInvoice() {
    return httpNotImplemented('HttpSalesRepository', 'cancelInvoice');
  }

  async correctCurrency() {
    return httpNotImplemented('HttpSalesRepository', 'correctCurrency');
  }

  async createDraft() {
    return httpNotImplemented('HttpSalesRepository', 'createDraft');
  }

  async getDraft() {
    return httpNotImplemented('HttpSalesRepository', 'getDraft');
  }

  async addLine() {
    return httpNotImplemented('HttpSalesRepository', 'addLine');
  }

  async removeLine() {
    return httpNotImplemented('HttpSalesRepository', 'removeLine');
  }

  async setLinePrice() {
    return httpNotImplemented('HttpSalesRepository', 'setLinePrice');
  }

  async setDraftMeta() {
    return httpNotImplemented('HttpSalesRepository', 'setDraftMeta');
  }

  async confirmInvoice(_draftId: string, _payment?: ConfirmInvoicePayment) {
    return httpNotImplemented('HttpSalesRepository', 'confirmInvoice');
  }

  async discardDraft() {
    return httpNotImplemented('HttpSalesRepository', 'discardDraft');
  }
}

export class HttpWorkOrderRepository implements WorkOrderRepository {
  async list() {
    return httpNotImplemented('HttpWorkOrderRepository', 'list');
  }

  async getById() {
    return httpNotImplemented('HttpWorkOrderRepository', 'getById');
  }

  async listForMechanic() {
    return httpNotImplemented('HttpWorkOrderRepository', 'listForMechanic');
  }

  async getForMechanic() {
    return httpNotImplemented('HttpWorkOrderRepository', 'getForMechanic');
  }

  async getCreateOptions() {
    return httpNotImplemented('HttpWorkOrderRepository', 'getCreateOptions');
  }

  async createManual() {
    return httpNotImplemented('HttpWorkOrderRepository', 'createManual');
  }

  async reassign() {
    return httpNotImplemented('HttpWorkOrderRepository', 'reassign');
  }

  async cancel() {
    return httpNotImplemented('HttpWorkOrderRepository', 'cancel');
  }

  async takeOrder() {
    return httpNotImplemented('HttpWorkOrderRepository', 'takeOrder');
  }

  async addPhoto() {
    return httpNotImplemented('HttpWorkOrderRepository', 'addPhoto');
  }

  async completeDesarme() {
    return httpNotImplemented('HttpWorkOrderRepository', 'completeDesarme');
  }

  async completeInstalacion() {
    return httpNotImplemented('HttpWorkOrderRepository', 'completeInstalacion');
  }
}

export class HttpCategoryRepository implements CategoryRepository {
  async list() {
    return httpNotImplemented('HttpCategoryRepository', 'list');
  }

  async save() {
    return httpNotImplemented('HttpCategoryRepository', 'save');
  }
}

export class HttpServiceRepository implements ServiceRepository {
  async list() {
    return httpNotImplemented('HttpServiceRepository', 'list');
  }

  async save() {
    return httpNotImplemented('HttpServiceRepository', 'save');
  }
}

export class HttpEventRepository implements EventRepository {
  async list() {
    return httpNotImplemented('HttpEventRepository', 'list');
  }
}

export class HttpDashboardRepository implements DashboardRepository {
  async getSnapshot() {
    return httpNotImplemented('HttpDashboardRepository', 'getSnapshot');
  }
}

export class HttpProfitabilityRepository implements ProfitabilityRepository {
  async getSnapshot() {
    return httpNotImplemented('HttpProfitabilityRepository', 'getSnapshot');
  }

  async setFxAvailable() {
    return httpNotImplemented('HttpProfitabilityRepository', 'setFxAvailable');
  }

  async retryUsd() {
    return httpNotImplemented('HttpProfitabilityRepository', 'retryUsd');
  }

  async recordManualGrossProfit() {
    return httpNotImplemented('HttpProfitabilityRepository', 'recordManualGrossProfit');
  }
}

export class HttpRecoveryRepository implements RecoveryRepository {
  async getSnapshot() {
    return httpNotImplemented('HttpRecoveryRepository', 'getSnapshot');
  }

  async releaseReservation() {
    return httpNotImplemented('HttpRecoveryRepository', 'releaseReservation');
  }

  async retryUsdProfitability() {
    return httpNotImplemented('HttpRecoveryRepository', 'retryUsdProfitability');
  }
}

export const httpAuthRepository = new HttpAuthRepository();
export const httpUserRepository = new HttpUserRepository();
export const httpInventoryRepository = new HttpInventoryRepository();
export const httpCustomerRepository = new HttpCustomerRepository();
export const httpSalesRepository = new HttpSalesRepository();
export const httpWorkOrderRepository = new HttpWorkOrderRepository();
export const httpCategoryRepository = new HttpCategoryRepository();
export const httpServiceRepository = new HttpServiceRepository();
export const httpEventRepository = new HttpEventRepository();
export const httpDashboardRepository = new HttpDashboardRepository();
export const httpProfitabilityRepository = new HttpProfitabilityRepository();
export const httpRecoveryRepository = new HttpRecoveryRepository();
