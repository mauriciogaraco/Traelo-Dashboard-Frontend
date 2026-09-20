import type { ReactNode } from 'react';
import { useAppSelector } from '@/app/hooks';

interface ForBusinessOwnerProps {
  owner: ReactNode;
  other: ReactNode;
}

/**
 * Rutas compartidas entre el personal y el dueño de negocio (inicio, pedidos): cada rol ve su
 * propia pantalla. El dueño nunca cae en las pantallas de gestión — su acceso real lo impone el
 * backend; esto solo evita que vea pantallas que le devolverían 403.
 */
export function ForBusinessOwner({ owner, other }: ForBusinessOwnerProps) {
  const role = useAppSelector((state) => state.auth.user?.role);
  return <>{role === 'BUSINESS_OWNER' ? owner : other}</>;
}
