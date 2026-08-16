import type { CommissionType, OrderStatus, Role, SubscriptionCycle, SubscriptionStatus } from './types';

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: 'Dueño',
  ADMIN: 'Administrador',
  EMPLOYEE: 'Empleado',
  DELIVERER: 'Mensajero',
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
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};
