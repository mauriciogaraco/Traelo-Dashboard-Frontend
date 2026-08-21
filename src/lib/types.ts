// Tipos espejo de los enums y formas de respuesta del backend (Traelo-Dashboard-backend).
// Mantener sincronizado con src/generated/prisma/enums.ts y los *.dto.ts / *.service.ts del backend.

export const Role = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  EMPLOYEE: 'EMPLOYEE',
  DELIVERER: 'DELIVERER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const CommissionType = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED_PER_PRODUCT: 'FIXED_PER_PRODUCT',
} as const;
export type CommissionType = (typeof CommissionType)[keyof typeof CommissionType];

export const SubscriptionCycle = {
  DAYS_7: 'DAYS_7',
  DAYS_15: 'DAYS_15',
  DAYS_21: 'DAYS_21',
  DAYS_30: 'DAYS_30',
} as const;
export type SubscriptionCycle = (typeof SubscriptionCycle)[keyof typeof SubscriptionCycle];

export const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const OrderStatus = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const SettlementType = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
} as const;
export type SettlementType = (typeof SettlementType)[keyof typeof SettlementType];

export const SettlementStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
} as const;
export type SettlementStatus = (typeof SettlementStatus)[keyof typeof SettlementStatus];

export const DateRangePreset = {
  today: 'today',
  week: 'week',
  month: 'month',
  '6months': '6months',
  year: 'year',
  custom: 'custom',
} as const;
export type DateRangePreset = (typeof DateRangePreset)[keyof typeof DateRangePreset];

export interface DateRangeQuery {
  range?: DateRangePreset;
  from?: string;
  to?: string;
}

// ── Envolturas de respuesta (shared/http/ApiResponse.ts) ──────────────────

export interface ApiOk<T> {
  data: T;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiPaginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

// Forma del error tal como la serializa middlewares/errorHandler.ts
export interface ApiErrorBody {
  error: string;
  details?: unknown;
}

// ── DTOs de dominio ─────────────────────────────────────────────────────

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DelivererDTO {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  active: boolean;
  joinedAt: string;
  commissionPercentage: number | null;
  effectiveCommissionPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessDTO {
  id: string;
  name: string;
  phone: string;
  address: string;
  joinedAt: string;
  active: boolean;
  commissionType: CommissionType;
  commissionPercentage: number | null;
  defaultProductCommissionAmount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessDetailDTO extends BusinessDTO {
  currentSubscription: BusinessSubscriptionDTO | null;
}

export interface ProductDTO {
  id: string;
  businessId: string;
  name: string;
  category: string | null;
  price: number | null;
  active: boolean;
  externalId: string | null;
  commission: { commissionAmount: number } | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessSubscriptionDTO {
  id: string;
  businessId: string;
  cycle: SubscriptionCycle;
  price: number;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  createdAt: string;
}

export interface OrderItemDTO {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  commissionAmount: number;
}

export interface OrderBusinessDTO {
  id: string;
  businessId: string;
  businessName: string;
  subtotal: number;
  commissionEarned: number;
  commissionTypeSnapshot: CommissionType | null;
  commissionRateSnapshot: number | null;
  items: OrderItemDTO[];
}

export interface OrderDTO {
  id: string;
  orderNumber: number;
  customerName: string;
  customerAddress: string;
  addressReference: string | null;
  customerPhone: string;
  deliveryFee: number;
  status: OrderStatus;
  orderDate: string;
  assignedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  delivererId: string | null;
  delivererName: string | null;
  registeredByUserId: string;
  registeredByName: string;
  productsTotal: number; // subtotal de productos — 100% del negocio
  platformFee: number; // "Servicio Tráelo" — cargo visible, redondeado
  total: number; // productsTotal + deliveryFee + platformFee
  traeloEarning: number; // ganancia total de Tráelo = platformFee + traeloDeliveryShare
  traeloDeliveryShare: number;
  delivererEarning: number;
  businesses: OrderBusinessDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface SettlementDTO {
  id: string;
  type: SettlementType;
  delivererId: string;
  delivererName: string;
  periodStart: string;
  periodEnd: string;
  status: SettlementStatus;
  totalDeliveries: number;
  totalCollected: number;
  traeloDeliveryShare: number;
  delivererShare: number;
  platformFeeCollected: number;
  totalToDeliver: number;
  closedAt: string | null;
  closedByUserId: string | null;
  closedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementOrderDTO {
  id: string;
  orderNumber: number;
  customerName: string;
  businessNames: string[];
  completedAt: string | null;
  deliveryFee: number;
  delivererEarning: number;
  traeloDeliveryShare: number;
  platformFee: number;
  total: number;
}

export interface SalesReportDTO {
  totalOrders: number;
  completedOrders: number;
  // Ventas PROCESADAS PARA LOS NEGOCIOS (100% suyo) — nunca "ventas de Tráelo".
  businessSalesGross: number;
  platformFeeRevenue: number;
  deliveryFeeGross: number;
  delivererShareTotal: number;
  traeloDeliveryShareTotal: number;
  traeloTotalRevenue: number;
  averageTicket: number;
}

export interface TopBusinessDTO {
  businessId: string;
  businessName: string;
  totalSales: number;
  totalCommission: number;
  orderCount: number;
}

export interface TopDelivererDTO {
  delivererId: string;
  delivererName: string;
  deliveryCount: number;
  totalEarnings: number;
  platformFeeCollected: number;
}

export interface BusinessSalesDetailDTO {
  businessId: string;
  businessName: string;
  totalSales: number;
  totalCommission: number;
  orderCount: number;
  averageSale: number;
  maxSale: number;
  topProducts: {
    productId: string | null;
    productName: string;
    quantitySold: number;
    totalSales: number;
  }[];
}

export interface BusinessDelivererProductDTO {
  productId: string | null;
  productName: string;
  quantity: number;
  totalSales: number;
}

export interface BusinessDelivererBreakdownDTO {
  delivererId: string;
  delivererName: string;
  products: BusinessDelivererProductDTO[];
  totalQuantity: number;
  totalSales: number;
}

export interface DashboardSummaryDTO {
  totalOrders: number;
  completedOrders: number;
  businessSalesGross: number;
  platformFeeRevenue: number;
  deliveryFeeGross: number;
  delivererShareTotal: number;
  traeloDeliveryShareTotal: number;
  traeloTotalRevenue: number;
  businessCount: number;
  delivererCount: number;
  averageTicket: number;
  topBusiness: TopBusinessDTO | null;
  topDeliverer: TopDelivererDTO | null;
}

// Lo que recibe un mensajero desde /dashboard/summary: nunca incluye las ganancias totales de
// Tráelo (ni platformFeeRevenue ni traeloDeliveryShareTotal/traeloTotalRevenue).
export interface DelivererDashboardSummaryDTO {
  totalOrders: number;
  completedOrders: number;
  averageTicket: number;
  topBusiness: TopBusinessDTO | null;
  topDeliverer: TopDelivererDTO | null;
}

export interface SystemConfigDTO {
  id: string;
  defaultDelivererCommissionPercentage: number;
  updatedAt: string;
}
