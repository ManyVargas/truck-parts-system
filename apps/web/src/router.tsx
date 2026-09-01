import { Navigate, createBrowserRouter } from 'react-router-dom';

import { LoginPage } from './features/auth/LoginPage';
import { CustomersPage } from './features/customers/CustomersPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { InventoryDetailPage } from './features/inventory/InventoryDetailPage';
import { InvoiceDetailPage } from './features/sales/InvoiceDetailPage';
import { InventoryPage } from './features/inventory/InventoryPage';
import { MechanicLayout } from './features/mechanic/MechanicLayout';
import { MechanicPlaceholderPage } from './features/mechanic/MechanicPlaceholderPage';
import { PlaceholderPage } from './features/placeholder/PlaceholderPage';
import { NotFoundPage } from './features/placeholder/NotFoundPage';
import { PosPage } from './features/sales/PosPage';
import { SalesPage } from './features/sales/SalesPage';
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
    element: <SalesPage />,
  },
  {
    path: '/sales/draft/:id',
    element: <PosPage />,
  },
  {
    path: '/sales/:id',
    element: <InvoiceDetailPage />,
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
  {
    path: '/profile',
    element: <ProfilePage />,
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
        element: <ProfilePage />,
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
