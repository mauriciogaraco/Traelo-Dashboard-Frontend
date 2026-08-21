import {
  BarChart3,
  Bike,
  CupSoda,
  LayoutDashboard,
  Package,
  Settings,
  Store,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/lib/types';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

export const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['OWNER', 'ADMIN', 'EMPLOYEE', 'DELIVERER'],
  },
  {
    to: '/orders',
    label: 'Pedidos',
    icon: Package,
    roles: ['OWNER', 'ADMIN', 'EMPLOYEE', 'DELIVERER'],
  },
  { to: '/businesses', label: 'Negocios', icon: Store, roles: ['OWNER', 'ADMIN', 'EMPLOYEE'] },
  { to: '/deliverers', label: 'Mensajeros', icon: Bike, roles: ['OWNER', 'ADMIN', 'EMPLOYEE'] },
  {
    to: '/settlements',
    label: 'Cuadres',
    icon: Wallet,
    roles: ['OWNER', 'ADMIN', 'EMPLOYEE', 'DELIVERER'],
  },
  { to: '/reports', label: 'Reportes', icon: BarChart3, roles: ['OWNER', 'ADMIN', 'EMPLOYEE'] },
  { to: '/cronos', label: 'Cronos', icon: CupSoda, roles: ['OWNER', 'ADMIN', 'EMPLOYEE'] },
  { to: '/users', label: 'Usuarios', icon: Users, roles: ['OWNER', 'ADMIN'] },
  { to: '/config', label: 'Configuración', icon: Settings, roles: ['OWNER', 'ADMIN'] },
];
