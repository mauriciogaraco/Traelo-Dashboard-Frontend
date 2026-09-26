import {
  BarChart3,
  Bike,
  CupSoda,
  HeartHandshake,
  LayoutDashboard,
  Package,
  Settings,
  Store,
  Tags,
  TrendingUp,
  Trophy,
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
    roles: ['OWNER', 'ADMIN', 'EMPLOYEE', 'DELIVERER', 'BUSINESS_OWNER'],
  },
  {
    to: '/orders',
    label: 'Pedidos',
    icon: Package,
    roles: ['OWNER', 'ADMIN', 'EMPLOYEE', 'DELIVERER', 'BUSINESS_OWNER'],
  },
  { to: '/customers', label: 'Clientes', icon: HeartHandshake, roles: ['BUSINESS_OWNER'] },
  { to: '/my-business', label: 'Mi negocio', icon: Store, roles: ['BUSINESS_OWNER'] },
  { to: '/businesses', label: 'Negocios', icon: Store, roles: ['OWNER', 'ADMIN', 'EMPLOYEE'] },
  { to: '/deliverers', label: 'Mensajeros', icon: Bike, roles: ['OWNER', 'ADMIN', 'EMPLOYEE'] },
  {
    to: '/settlements',
    label: 'Cuadres',
    icon: Wallet,
    roles: ['OWNER', 'ADMIN', 'EMPLOYEE', 'DELIVERER'],
  },
  { to: '/categories', label: 'Categorías', icon: Tags, roles: ['OWNER', 'ADMIN'] },
  { to: '/raffle', label: 'Sorteo', icon: Trophy, roles: ['OWNER', 'ADMIN'] },
  { to: '/reports', label: 'Reportes', icon: BarChart3, roles: ['OWNER', 'ADMIN', 'EMPLOYEE'] },
  { to: '/analytics', label: 'Analytics', icon: TrendingUp, roles: ['OWNER', 'ADMIN', 'EMPLOYEE'] },
  { to: '/cronos', label: 'Cronos', icon: CupSoda, roles: ['OWNER', 'ADMIN', 'EMPLOYEE'] },
  { to: '/users', label: 'Usuarios', icon: Users, roles: ['OWNER', 'ADMIN'] },
  { to: '/config', label: 'Configuración', icon: Settings, roles: ['OWNER', 'ADMIN'] },
];
