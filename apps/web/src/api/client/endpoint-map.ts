/**
 * Documented HTTP map for the mock → API swap.
 * Paths follow the future Express API; none are called until VITE_USE_MOCK_API=false
 * and the matching backend milestone exists.
 */
export const REPOSITORY_ENDPOINT_MAP = {
  AuthRepository: {
    login: 'POST /api/auth/login',
    logout: 'POST /api/auth/logout',
    getSession: 'GET /api/auth/session',
    getCurrentUser: 'GET /api/auth/me',
    updateOwnProfile: 'PATCH /api/auth/me',
  },
  UserRepository: {
    list: 'GET /api/users',
    getById: 'GET /api/users/:id',
    save: 'PUT /api/users/:id',
  },
  DashboardRepository: {
    getSnapshot: 'GET /api/dashboard',
  },
  InventoryRepository: {
    listCatalog: 'GET /api/inventory',
    getDetail: 'GET /api/inventory/:id',
    addToDraft: 'POST /api/inventory/:id/draft',
    registerItem: 'POST /api/inventory/items',
    registerAssembly: 'POST /api/inventory/assemblies',
    registerQtyProduct: 'POST /api/inventory/qty-products',
  },
  CustomerRepository: {
    list: 'GET /api/customers',
    search: 'GET /api/customers?q=',
    getById: 'GET /api/customers/:id',
    save: 'PUT /api/customers/:id',
  },
  SalesRepository: {
    listInvoices: 'GET /api/sales',
    getInvoice: 'GET /api/sales/:id',
    addPayment: 'POST /api/sales/:id/payments',
    cancelInvoice: 'POST /api/sales/:id/cancel',
    confirmInvoice: 'POST /api/sales/:id/confirm',
    discardDraft: 'POST /api/sales/:id/discard',
  },
  WorkOrderRepository: {
    list: 'GET /api/work-orders',
    getById: 'GET /api/work-orders/:id',
    takeOrder: 'POST /api/work-orders/:id/take',
    completeDesarme: 'POST /api/work-orders/:id/complete-dismantling',
  },
  CategoryRepository: {
    list: 'GET /api/catalogs/categories',
    save: 'PUT /api/catalogs/categories/:id',
  },
  ServiceRepository: {
    list: 'GET /api/catalogs/services',
    save: 'PUT /api/catalogs/services/:id',
  },
  ProfitabilityRepository: {
    getSnapshot: 'GET /api/profitability',
    setFxAvailable: 'POST /api/profitability/fx (demo only — not a production endpoint)',
    retryUsd: 'POST /api/profitability/:invoiceId/retry',
    recordManualGrossProfit: 'POST /api/profitability/:invoiceId/manual-gross-profit',
  },
  RecoveryRepository: {
    getSnapshot: 'GET /api/recovery',
    releaseReservation: 'POST /api/recovery/reservations/:draftId/release',
    retryUsdProfitability: 'POST /api/recovery/profitability/:invoiceId/retry',
  },
} as const;
