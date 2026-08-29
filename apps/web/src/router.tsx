import { Navigate, createBrowserRouter } from 'react-router-dom';

import { LoginPage } from './features/auth/LoginPage';
import { CustomersPage } from './features/customers/CustomersPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { InventoryDetailPage } from './features/inventory/InventoryDetailPage';
import { InventoryPage } from './features/inventory/InventoryPage';
import { MechanicLayout } from './features/mechanic/MechanicLayout';
import { MechanicPlaceholderPage } from './features/mechanic/MechanicPlaceholderPage';
import { PlaceholderPage } from './features/placeholder/PlaceholderPage';
import { NotFoundPage } from './features/placeholder/NotFoundPage';
import { AppShell } from './shared/layout/AppShell';
import { CatchAllRoute } from './shared/layout/CatchAllRoute';
import { GuestRoute } from './shared/layout/GuestRoute';
import { ProtectedRoute } from './shared/layout/ProtectedRoute';
import { RouteAccessGuard } from './shared/layout/RouteAccessGuard';

const desktopChildRoutes = [
  {
    path: '/dashboard',
    element: <DashboardPage />,
  },
  {
    path: '/inventory',
    element: <InventoryPage />,
  },
  {
    path: '/inventory/:id',
    element: <InventoryDetailPage />,
  },
  {
    path: '/sales',
    element: (
      <PlaceholderPage
        title="Ventas y Facturas"
        milestone="WM7"
        description="Listado, detalle, pagos y cancelación."
      />
    ),
  },
  {
    path: '/sales/draft/:id',
    element: <PlaceholderPage title="Punto de venta" milestone="WM8" />,
  },
  {
    path: '/sales/:id',
    element: <PlaceholderPage title="Detalle de factura" milestone="WM7" />,
  },
  {
    path: '/customers',
    element: <CustomersPage />,
  },
  {
    path: '/work-orders',
    element: <PlaceholderPage title="Órdenes de Trabajo" milestone="WM9" />,
  },
  {
    path: '/catalogs',
    element: <PlaceholderPage title="Catálogos" milestone="WM11" />,
  },
  {
    path: '/users',
    element: <PlaceholderPage title="Usuarios" milestone="WM11" />,
  },
  {
    path: '/profitability',
    element: <PlaceholderPage title="Rentabilidad" milestone="WM12" />,
  },
  {
    path: '/recovery',
    element: <PlaceholderPage title="Administración y Recuperación" milestone="WM12" />,
  },
];

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <GuestRoute>
        <LoginPage />
      </GuestRoute>
    ),
  },
  {
    path: '/mechanic',
    element: (
      <ProtectedRoute roles={['MECHANIC']}>
        <MechanicLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/mechanic/pending" replace /> },
      {
        path: 'pending',
        element: <MechanicPlaceholderPage title="Pendientes" />,
      },
      {
        path: 'mine',
        element: <MechanicPlaceholderPage title="Mis órdenes" />,
      },
      {
        path: 'profile',
        element: <MechanicPlaceholderPage title="Perfil" />,
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: (
      <ProtectedRoute roles={['ADMINISTRATOR', 'SELLER']}>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        element: <RouteAccessGuard />,
        children: [
          ...desktopChildRoutes,
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <CatchAllRoute />,
  },
]);
