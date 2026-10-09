import {
  BarChart3,
  Bell,
  Bike,
  CupSoda,
  HeartHandshake,
  LayoutDashboard,
  Package,
  ShoppingBasket,
  Settings,
  Shield,
  Smartphone,
  Star,
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

// Subsección desplegable. No tiene ruta propia: solo agrupa ítems. Si por el rol del usuario
// queda un único hijo visible, la barra lo muestra como link suelto (ver visibleNavEntries).
export interface NavGroup {
  label: string;
  icon: LucideIcon;
  children: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry;
}

export const navEntries: NavEntry[] = [
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
  {
    label: 'Catálogo',
    icon: Store,
    children: [
      { to: '/businesses', label: 'Negocios', icon: Store, roles: ['OWNER', 'ADMIN', 'EMPLOYEE'] },
      { to: '/categories', label: 'Categorías', icon: Tags, roles: ['OWNER', 'ADMIN'] },
      { to: '/products', label: 'Productos', icon: ShoppingBasket, roles: ['OWNER', 'ADMIN'] },
    ],
  },
  {
    label: 'Reparto',
    icon: Bike,
    children: [
      { to: '/deliverers', label: 'Mensajeros', icon: Bike, roles: ['OWNER', 'ADMIN', 'EMPLOYEE'] },
      {
        to: '/settlements',
        label: 'Cuadres',
        icon: Wallet,
        roles: ['OWNER', 'ADMIN', 'EMPLOYEE', 'DELIVERER'],
      },
    ],
  },
  {
    label: 'Clientes y marketing',
    icon: HeartHandshake,
    children: [
      {
        to: '/app-customers',
        label: 'Clientes de la app',
        icon: Smartphone,
        roles: ['OWNER', 'ADMIN'],
      },
      { to: '/reviews', label: 'Reseñas', icon: Star, roles: ['OWNER', 'ADMIN'] },
      { to: '/notifications', label: 'Notificaciones', icon: Bell, roles: ['OWNER', 'ADMIN'] },
      { to: '/raffle', label: 'Sorteo', icon: Trophy, roles: ['OWNER', 'ADMIN'] },
    ],
  },
  {
    label: 'Análisis',
    icon: BarChart3,
    children: [
      { to: '/reports', label: 'Reportes', icon: BarChart3, roles: ['OWNER', 'ADMIN', 'EMPLOYEE'] },
      {
        to: '/analytics',
        label: 'Analytics',
        icon: TrendingUp,
        roles: ['OWNER', 'ADMIN', 'EMPLOYEE'],
      },
      { to: '/cronos', label: 'Cronos', icon: CupSoda, roles: ['OWNER', 'ADMIN', 'EMPLOYEE'] },
    ],
  },
  {
    label: 'Administración',
    icon: Shield,
    children: [
      { to: '/users', label: 'Usuarios', icon: Users, roles: ['OWNER', 'ADMIN'] },
      { to: '/config', label: 'Configuración', icon: Settings, roles: ['OWNER', 'ADMIN'] },
    ],
  },
];

// Filtra por rol y colapsa los grupos: sin hijos visibles el grupo desaparece, con uno solo se
// muestra ese hijo como link suelto (un grupo de un único ítem solo estorba).
export function visibleNavEntries(role: Role | undefined): NavEntry[] {
  const canSee = (item: NavItem) => !role || item.roles.includes(role);
  const result: NavEntry[] = [];
  for (const entry of navEntries) {
    if (!isNavGroup(entry)) {
      if (canSee(entry)) result.push(entry);
      continue;
    }
    const children = entry.children.filter(canSee);
    const [onlyChild] = children;
    if (children.length === 1 && onlyChild) result.push(onlyChild);
    else if (children.length > 1) result.push({ ...entry, children });
  }
  return result;
}
