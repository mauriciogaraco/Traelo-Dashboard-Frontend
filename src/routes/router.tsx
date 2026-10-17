import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { ForBusinessOwner } from './ForBusinessOwner';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleGate } from './RoleGate';

// Páginas del dashboard protegido: en lazy chunks separados para que cada rol solo descargue el
// código de las pantallas que puede ver, en vez de las ~30 páginas en el bundle inicial.
const ChangePasswordPage = lazy(() =>
  import('@/features/auth/ChangePasswordPage').then((m) => ({ default: m.ChangePasswordPage })),
);
const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const CronosPage = lazy(() =>
  import('@/features/cronos/CronosPage').then((m) => ({ default: m.CronosPage })),
);
const ReportsPage = lazy(() =>
  import('@/features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const AnalyticsPage = lazy(() =>
  import('@/features/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
);
const AbandonedCartsPage = lazy(() =>
  import('@/features/behavior/AbandonedCartsPage').then((m) => ({ default: m.AbandonedCartsPage })),
);
const AppCustomersPage = lazy(() =>
  import('@/features/appCustomers/AppCustomersPage').then((m) => ({ default: m.AppCustomersPage })),
);
const CitiesPage = lazy(
  () => import('@/features/cities/CitiesPage').then((m) => ({ default: m.CitiesPage })),
);
const UsersPage = lazy(() =>
  import('@/features/users/UsersPage').then((m) => ({ default: m.UsersPage })),
);
const DeliverersPage = lazy(() =>
  import('@/features/deliverers/DeliverersPage').then((m) => ({ default: m.DeliverersPage })),
);
const BusinessesPage = lazy(() =>
  import('@/features/businesses/BusinessesPage').then((m) => ({ default: m.BusinessesPage })),
);
const BusinessDetailPage = lazy(() =>
  import('@/features/businesses/BusinessDetailPage').then((m) => ({ default: m.BusinessDetailPage })),
);
const CategoriesPage = lazy(() =>
  import('@/features/categories/CategoriesPage').then((m) => ({ default: m.CategoriesPage })),
);
const RafflePage = lazy(() =>
  import('@/features/raffle/RafflePage').then((m) => ({ default: m.RafflePage })),
);
const ConfigPage = lazy(() =>
  import('@/features/config/ConfigPage').then((m) => ({ default: m.ConfigPage })),
);
const NotificationsPage = lazy(() =>
  import('@/features/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const ReviewsPage = lazy(() =>
  import('@/features/reviews/ReviewsPage').then((m) => ({ default: m.ReviewsPage })),
);
const PuntosPage = lazy(() =>
  import('@/features/puntos/PuntosPage').then((m) => ({ default: m.PuntosPage })),
);
const ProductsPage = lazy(() =>
  import('@/features/products/ProductsPage').then((m) => ({ default: m.ProductsPage })),
);
const ProductProposalsPage = lazy(() =>
  import('@/features/productProposals/ProductProposalsPage').then((m) => ({
    default: m.ProductProposalsPage,
  })),
);
const OrdersPage = lazy(() =>
  import('@/features/orders/OrdersPage').then((m) => ({ default: m.OrdersPage })),
);
const OrderDetailPage = lazy(() =>
  import('@/features/orders/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })),
);
const CreateOrderPage = lazy(() =>
  import('@/features/orders/CreateOrderPage').then((m) => ({ default: m.CreateOrderPage })),
);
const EditOrderPage = lazy(() =>
  import('@/features/orders/EditOrderPage').then((m) => ({ default: m.EditOrderPage })),
);
const SettlementsPage = lazy(() =>
  import('@/features/settlements/SettlementsPage').then((m) => ({ default: m.SettlementsPage })),
);
const SettlementDetailPage = lazy(() =>
  import('@/features/settlements/SettlementDetailPage').then((m) => ({
    default: m.SettlementDetailPage,
  })),
);
const MyBusinessPage = lazy(() =>
  import('@/features/portal/MyBusinessPage').then((m) => ({ default: m.MyBusinessPage })),
);
const PortalCustomersPage = lazy(() =>
  import('@/features/portal/PortalCustomersPage').then((m) => ({ default: m.PortalCustomersPage })),
);
const PortalDashboardPage = lazy(() =>
  import('@/features/portal/PortalDashboardPage').then((m) => ({ default: m.PortalDashboardPage })),
);
const PortalOrdersPage = lazy(() =>
  import('@/features/portal/PortalOrdersPage').then((m) => ({ default: m.PortalOrdersPage })),
);

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <ForBusinessOwner owner={<PortalDashboardPage />} other={<DashboardPage />} />,
          },
          {
            path: 'orders',
            element: <ForBusinessOwner owner={<PortalOrdersPage />} other={<OrdersPage />} />,
          },
          {
            path: 'orders/:id',
            element: (
              <ForBusinessOwner owner={<Navigate to="/orders" replace />} other={<OrderDetailPage />} />
            ),
          },
          { path: 'change-password', element: <ChangePasswordPage /> },
          {
            // Cuadres: solo mensajeros y personal de Tráelo — un dueño de negocio no los ve.
            element: <RoleGate allow={['OWNER', 'ADMIN', 'EMPLOYEE', 'DELIVERER']} />,
            children: [
              { path: 'settlements', element: <SettlementsPage /> },
              { path: 'settlements/:id', element: <SettlementDetailPage /> },
            ],
          },
          {
            element: <RoleGate allow={['BUSINESS_OWNER']} />,
            children: [
              { path: 'customers', element: <PortalCustomersPage /> },
              { path: 'my-business', element: <MyBusinessPage /> },
            ],
          },
          {
            element: <RoleGate allow={['OWNER', 'ADMIN', 'EMPLOYEE']} />,
            children: [
              { path: 'orders/new', element: <CreateOrderPage /> },
              { path: 'orders/:id/edit', element: <EditOrderPage /> },
              { path: 'businesses', element: <BusinessesPage /> },
              { path: 'businesses/:id', element: <BusinessDetailPage /> },
              { path: 'deliverers', element: <DeliverersPage /> },
              { path: 'reports', element: <ReportsPage /> },
              { path: 'analytics', element: <AnalyticsPage /> },
              { path: 'abandoned-carts', element: <AbandonedCartsPage /> },
              { path: 'cronos', element: <CronosPage /> },
            ],
          },
          {
            element: <RoleGate allow={['OWNER', 'ADMIN']} />,
            children: [
              { path: 'categories', element: <CategoriesPage /> },
              { path: 'raffle', element: <RafflePage /> },
              { path: 'app-customers', element: <AppCustomersPage /> },
              { path: 'puntos', element: <PuntosPage /> },
              { path: 'users', element: <UsersPage /> },
              { path: 'cities', element: <CitiesPage /> },
              { path: 'config', element: <ConfigPage /> },
              { path: 'notifications', element: <NotificationsPage /> },
              { path: 'reviews', element: <ReviewsPage /> },
              { path: 'products', element: <ProductsPage /> },
            ],
          },
          {
            // COMMERCIAL solo ve esta pantalla — no hereda el resto de los permisos de
            // OWNER/ADMIN (ver Role.COMMERCIAL en el backend).
            element: <RoleGate allow={['OWNER', 'ADMIN', 'COMMERCIAL']} />,
            children: [{ path: 'product-proposals', element: <ProductProposalsPage /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
