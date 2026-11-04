import type {
  CommissionType,
  OrderStatus,
  Role,
  SettlementStatus,
  SettlementType,
  SubscriptionCycle,
  SubscriptionStatus,
} from './types';

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: 'Dueño',
  ADMIN: 'Administrador',
  EMPLOYEE: 'Empleado',
  DELIVERER: 'Mensajero',
  BUSINESS_OWNER: 'Dueño de negocio',
  COMMERCIAL: 'Comercial',
};

export const COMMISSION_TYPE_LABEL: Record<CommissionType, string> = {
  PERCENTAGE: '% sobre ventas',
  FIXED_PER_PRODUCT: 'Monto fijo por producto',
};

export const SUBSCRIPTION_CYCLE_LABEL: Record<SubscriptionCycle, string> = {
  DAYS_7: '7 días',
  DAYS_15: '15 días',
  DAYS_21: '21 días',
  DAYS_30: '30 días',
};

export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Activa',
  EXPIRED: 'Vencida',
  CANCELLED: 'Cancelada',
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  ASSIGNED: 'Asignado',
  CONFIRMED: 'Confirmado',
  HEADING_OUT: 'Yendo al negocio',
  PICKING_UP: 'Recogiendo',
  ON_THE_WAY: 'En camino',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

// Mismo color para toda la fase "en curso" (ASSIGNED en adelante): lo que le importa al staff
// de un vistazo es pendiente / en curso / terminado, no en qué sub-fase exacta del trayecto va
// el mensajero (eso lo ve con detalle en el pedido).
export const ORDER_STATUS_TONE: Record<OrderStatus, 'amber' | 'brand' | 'green' | 'slate'> = {
  PENDING: 'amber',
  ASSIGNED: 'brand',
  CONFIRMED: 'brand',
  HEADING_OUT: 'brand',
  PICKING_UP: 'brand',
  ON_THE_WAY: 'brand',
  COMPLETED: 'green',
  CANCELLED: 'slate',
};

// ASSIGNED cubre dos momentos distintos para el mensajero: todavía no aceptó el pedido ("Por
// aceptar") o ya lo aceptó pero no lo confirmó ("Por confirmar"). El resto de estados se muestran tal cual.
export function orderDisplayStatus(order: { status: OrderStatus; acceptedAt?: string | null }): {
  label: string;
  tone: 'amber' | 'brand' | 'green' | 'slate';
} {
  if (order.status === 'ASSIGNED') {
    return order.acceptedAt
      ? { label: 'Por confirmar', tone: 'brand' }
      : { label: 'Por aceptar', tone: 'amber' };
  }
  return { label: ORDER_STATUS_LABEL[order.status], tone: ORDER_STATUS_TONE[order.status] };
}

export const SETTLEMENT_TYPE_LABEL: Record<SettlementType, string> = {
  DAILY: 'Diario',
  WEEKLY: 'Semanal',
};

export const SETTLEMENT_STATUS_LABEL: Record<SettlementStatus, string> = {
  OPEN: 'Abierto',
  CLOSED: 'Cerrado',
};

// dayOfWeek del backend sigue Date#getDay(): 0 = domingo … 6 = sábado.
export const DAY_OF_WEEK_LABEL: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

// Orden de visualización habitual (lunes a domingo) sobre los valores de dayOfWeek.
export const DAY_OF_WEEK_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
