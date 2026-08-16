import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import type { Role } from '@/lib/types';

interface RoleGateProps {
  allow: Role[];
}

/** Oculta rutas hijas cuando el rol del usuario autenticado no está permitido. */
export function RoleGate({ allow }: RoleGateProps) {
  const role = useAppSelector((state) => state.auth.user?.role);

  if (!role || !allow.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
