import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { CronosPage } from '@/features/cronos/CronosPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage';
import { UsersPage } from '@/features/users/UsersPage';
import { DeliverersPage } from '@/features/deliverers/DeliverersPage';
import { BusinessesPage } from '@/features/businesses/BusinessesPage';
import { BusinessDetailPage } from '@/features/businesses/BusinessDetailPage';
import { CategoriesPage } from '@/features/categories/CategoriesPage';
import { RafflePage } from '@/features/raffle/RafflePage';
import { ConfigPage } from '@/features/config/ConfigPage';
import { OrdersPage } from '@/features/orders/OrdersPage';
import { OrderDetailPage } from '@/features/orders/OrderDetailPage';
import { CreateOrderPage } from '@/features/orders/CreateOrderPage';
import { EditOrderPage } from '@/features/orders/EditOrderPage';
import { SettlementsPage } from '@/features/settlements/SettlementsPage';
import { SettlementDetailPage } from '@/features/settlements/SettlementDetailPage';
import { MyBusinessPage } from '@/features/portal/MyBusinessPage';
import { PortalCustomersPage } from '@/features/portal/PortalCustomersPage';
import { PortalDashboardPage } from '@/features/portal/PortalDashboardPage';
import { PortalOrdersPage } from '@/features/portal/PortalOrdersPage';
import { ForBusinessOwner } from './ForBusinessOwner';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleGate } from './RoleGate';

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
              { path: 'cronos', element: <CronosPage /> },
            ],
          },
          {
            element: <RoleGate allow={['OWNER', 'ADMIN']} />,
            children: [
              { path: 'categories', element: <CategoriesPage /> },
              { path: 'raffle', element: <RafflePage /> },
              { path: 'users', element: <UsersPage /> },
              { path: 'config', element: <ConfigPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
