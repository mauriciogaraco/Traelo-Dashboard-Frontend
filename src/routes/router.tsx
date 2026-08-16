import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ModulePlaceholder } from '@/components/ui/ModulePlaceholder';
import { LoginPage } from '@/features/auth/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage';
import { UsersPage } from '@/features/users/UsersPage';
import { DeliverersPage } from '@/features/deliverers/DeliverersPage';
import { BusinessesPage } from '@/features/businesses/BusinessesPage';
import { BusinessDetailPage } from '@/features/businesses/BusinessDetailPage';
import { OrdersPage } from '@/features/orders/OrdersPage';
import { OrderDetailPage } from '@/features/orders/OrderDetailPage';
import { CreateOrderPage } from '@/features/orders/CreateOrderPage';
import { EditOrderPage } from '@/features/orders/EditOrderPage';
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
          { index: true, element: <ModulePlaceholder title="Dashboard" /> },
          { path: 'orders', element: <OrdersPage /> },
          { path: 'orders/:id', element: <OrderDetailPage /> },
          { path: 'settlements', element: <ModulePlaceholder title="Cuadres" /> },
          { path: 'change-password', element: <ChangePasswordPage /> },
          {
            element: <RoleGate allow={['OWNER', 'ADMIN', 'EMPLOYEE']} />,
            children: [
              { path: 'orders/new', element: <CreateOrderPage /> },
              { path: 'orders/:id/edit', element: <EditOrderPage /> },
              { path: 'businesses', element: <BusinessesPage /> },
              { path: 'businesses/:id', element: <BusinessDetailPage /> },
              { path: 'deliverers', element: <DeliverersPage /> },
              { path: 'reports', element: <ModulePlaceholder title="Reportes" /> },
            ],
          },
          {
            element: <RoleGate allow={['OWNER', 'ADMIN']} />,
            children: [
              { path: 'users', element: <UsersPage /> },
              { path: 'config', element: <ModulePlaceholder title="Configuración" /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
