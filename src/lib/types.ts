// Tipos espejo de los enums y formas de respuesta del backend (Traelo-Dashboard-backend).
// Mantener sincronizado con src/generated/prisma/enums.ts y los *.dto.ts / *.service.ts del backend.

export const Role = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  EMPLOYEE: 'EMPLOYEE',
  DELIVERER: 'DELIVERER',
  BUSINESS_OWNER: 'BUSINESS_OWNER',
  // Revisa y aprueba/rechaza propuestas de catálogo de los BUSINESS_OWNER — ver
  // features/productProposals. No tiene ningún otro permiso de ADMIN/OWNER.
  COMMERCIAL: 'COMMERCIAL',
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
  // Sub-fases del trayecto (app mensajero), entre ASSIGNED y COMPLETED — ver el comentario en
  // el enum OrderStatus del backend (schema.prisma). El staff puede saltárselas y completar o
  // cancelar directo desde cualquiera de ellas (ver ACTIVE_ORDER_STATUSES).
  CONFIRMED: 'CONFIRMED',
  HEADING_OUT: 'HEADING_OUT',
  PICKING_UP: 'PICKING_UP',
  ON_THE_WAY: 'ON_THE_WAY',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

// Estados "activos" previos a COMPLETED/CANCELLED — el mensajero puede estar en cualquiera de
// ellos (o nunca haber usado la app y seguir en ASSIGNED). El staff puede completar un pedido
// directo desde cualquiera de estos, sin pasar por los intermedios (ver
// ordersService.bulkCompleteOrders / STAFF_STATUS_TRANSITIONS en el backend).
// Estados en los que el staff puede pausar un pedido (tiene mensajero pero todavía no salió hacia el
// cliente). Igual que PAUSABLE_STATUSES en el backend (order-phases.ts).
export const PAUSABLE_ORDER_STATUSES: OrderStatus[] = ['ASSIGNED', 'CONFIRMED', 'HEADING_OUT', 'PICKING_UP'];

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'ASSIGNED',
  'CONFIRMED',
  'HEADING_OUT',
  'PICKING_UP',
  'ON_THE_WAY',
];

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

export interface UserCityDTO {
  id: string;
  name: string;
}

export interface CityDTO {
  id: string;
  name: string;
  code: string;
  active: boolean;
  // Centro del pueblo: desde aquí se mide la mensajería por km de la entrega en "otra ubicación".
  // null/ausente = sin configurar (esa opción no se ofrece para pedidos de esta ciudad).
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
  updatedAt: string;
}

// Configuración operativa por ciudad (CityConfig en el backend). Las horas llegan ancladas a
// 1970-01-01 UTC, igual que SystemConfig.
export interface CityConfigDTO {
  cityId: string;
  acceptingOrders: boolean;
  operatingHoursEnabled: boolean;
  operatingHoursStart: string | null;
  operatingHoursEnd: string | null;
  operatingHoursWeekendEnd: string | null;
  operationalMessage: string | null;
  // Cargo "Servicio Tráelo" en los pedidos de esta ciudad (false = se cotiza y crea en 0).
  chargePlatformFee: boolean;
  // CUP por kilómetro de la mensajería de "otra ubicación" (desde el centro del pueblo). Ausente en un backend anterior.
  outOfTownFeePerKm?: number;
  updatedAt: string;
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  active: boolean;
  // Solo para BUSINESS_OWNER. Opcionales: si el backend todavía no los devuelve llegan como
  // undefined, no null — leer siempre con `?? null`/`== null`.
  businessId?: string | null;
  businessName?: string | null;
  // Ciudades a las que queda acotado un ADMIN/EMPLOYEE (ver UserCityAccess en el backend) — []
  // o ausente = sin restricción, acceso global (todo el staff antes de multiciudad, y siempre
  // para OWNER). Opcional: backends sin multiciudad todavía no lo mandan.
  cities?: UserCityDTO[];
  createdAt: string;
  updatedAt: string;
}

// Vehículo con el que reparte un mensajero (por defecto bicicleta).
export type DelivererVehicle = 'BICYCLE' | 'ELECTRIC_MOTO' | 'TRICYCLE' | 'CAR';

export const DELIVERER_VEHICLE_LABELS: Record<DelivererVehicle, string> = {
  BICYCLE: 'Bicicleta',
  ELECTRIC_MOTO: 'Moto eléctrica',
  TRICYCLE: 'Triciclo',
  CAR: 'Carro',
};

export const DELIVERER_VEHICLES = Object.keys(DELIVERER_VEHICLE_LABELS) as DelivererVehicle[];

// Tarifa FIJA de mensajería cuando los negocios son de `originCity` y el pedido se entrega en `destinationCity`.
export interface DeliveryRouteDTO {
  originCity: { id: string; name: string; code: string };
  destinationCity: { id: string; name: string; code: string };
  fee: number;
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
  // Ausente en un backend anterior (equivale a bicicleta).
  vehicle?: DelivererVehicle;
  // "En turno hoy": en línea en la cola de despacho automático de la app de mensajero.
  // Distinto de `active` (alta/baja administrativa de la cuenta).
  onDuty: boolean;
  // Timestamp del turno (null si no está en línea). El más antiguo es el próximo en la cola.
  queuedAt: string | null;
  // Ciudades donde opera (ver DelivererCity en el backend). Ausente = backend sin multiciudad.
  cities?: UserCityDTO[];
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
  acceptingOrders: boolean;
  commissionType: CommissionType;
  commissionPercentage: number | null;
  defaultProductCommissionAmount: number | null;
  deliveryFeeBase: number;
  logoUrl: string | null;
  // Ciudad a la que pertenece (ver Business.cityId en el backend) — null si todavía no se le
  // asignó, o undefined si el backend todavía no manda el campo (sin multiciudad).
  cityId?: string | null;
  cityName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessDetailDTO extends BusinessDTO {
  currentSubscription: BusinessSubscriptionDTO | null;
}

export interface BusinessHoursDTO {
  id: string;
  businessId: string;
  dayOfWeek: number; // 0 = domingo … 6 = sábado (Date#getDay())
  openTime: string; // "HH:mm"
  closeTime: string; // "HH:mm"
  closed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessClosureDTO {
  id: string;
  businessId: string;
  date: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  imageUrl: string | null;
  imageBlurhash: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PackagingOption {
  name: string;
  price: number;
  capacity?: number;
}

/** Agrego de un producto: extra opcional con precio por unidad. */
export interface AddonOption {
  name: string;
  price: number;
}

export interface ProductDTO {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  category: string | null;
  categoryId: string | null;
  price: number | null;
  active: boolean;
  available: boolean;
  lowStock: boolean;
  externalId: string | null;
  imageUrl: string | null;
  /** Ausente en backends que aún no tienen el campo; null/[] = sin empaque. */
  packaging?: PackagingOption[] | null;
  /** Tipos o sabores a elegir (sin precio). null = ninguno; ausente en backends que aún no lo mandan. */
  options?: string[] | null;
  /** Agregos opcionales con precio por unidad. null = ninguno; ausente en backends que aún no lo mandan. */
  addons?: AddonOption[] | null;
  /** Unidades por caja (se vende por caja completa). null = se vende por unidad. */
  formato?: number | null;
  /** Precio por cantidad: desde `bulkMinQuantity` unidades, cada una cuesta `bulkPrice`. null = desactivado. */
  bulkMinQuantity?: number | null;
  bulkPrice?: number | null;
  /** "Ofertas destacadas" del Home de la app — lo marca un OWNER/ADMIN a mano. */
  featured: boolean;
  /** Tráelo Familia — excluye el producto del catálogo normal, solo OWNER/ADMIN lo marca. */
  familiaOnly: boolean;
  commission: { commissionAmount: number } | null;
  createdAt: string;
  updatedAt: string;
}

/** Fila del módulo global "Productos" (GET /products, cross-business) — solo OWNER/ADMIN. */
export interface AdminProductDTO extends ProductDTO {
  businessName: string;
}

export const ProposalType = { CREATE: 'CREATE', EDIT: 'EDIT' } as const;
export type ProposalType = (typeof ProposalType)[keyof typeof ProposalType];

export const ProposalStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;
export type ProposalStatus = (typeof ProposalStatus)[keyof typeof ProposalStatus];

/** Mismo shape para crear o editar un producto, sin featured/familiaOnly (ver schema backend). */
export interface ProposedProductData {
  name?: string;
  description?: string | null;
  category?: string;
  categoryId?: string | null;
  price?: number;
  imageUrl?: string | null;
  imageBlurhash?: string | null;
  packaging?: PackagingOption[] | null;
}

/** Snapshot del producto publicado al momento de revisar una propuesta EDIT (null en CREATE). */
export interface ProposalProductSnapshotDTO {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  categoryId: string | null;
  price: number | null;
  active: boolean;
  imageUrl: string | null;
  imageBlurhash: string | null;
  packaging: PackagingOption[] | null;
  updatedAt: string;
}

export interface ProductProposalDTO {
  id: string;
  businessId: string;
  businessName: string;
  productId: string | null;
  type: ProposalType;
  status: ProposalStatus;
  proposedData: ProposedProductData;
  baseProductUpdatedAt: string | null;
  createdByUserId: string;
  createdByName: string;
  reviewedByUserId: string | null;
  reviewedByName: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  currentProduct: ProposalProductSnapshotDTO | null;
}

export interface ProductOfferDTO {
  id: string;
  productId: string;
  price: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
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
  // Variantes de los pedidos de la app (tipo/sabor y agrego elegidos).
  optionName?: string | null;
  addonName?: string | null;
  // Empaque, caja y canje por puntos (el backend los manda siempre; opcionales por compatibilidad).
  packagingName?: string | null;
  packagingFee?: number;
  unitsPerPack?: number;
  pointsUnits?: number;
  pointsDiscount?: number;
}

/** Un cambio de una línea del vale (ver lastEditSummary del pedido). */
export type OrderItemChangeDTO =
  | { kind: 'added' | 'removed'; productName: string; quantity: number }
  | { kind: 'quantity' | 'price'; productName: string; from: number; to: number };

export interface OrderBusinessDTO {
  id: string;
  businessId: string;
  businessName: string;
  businessAddress?: string;
  subtotal: number;
  commissionEarned: number;
  commissionTypeSnapshot: CommissionType | null;
  commissionRateSnapshot: number | null;
  items: OrderItemDTO[];
}

export interface OrderDTO {
  id: string;
  // Ciudad donde se creó el pedido (snapshot; null en pedidos previos a multiciudad).
  cityId?: string | null;
  // Localidad donde se ENTREGA cuando es distinta a la de los negocios (mensajería fija entre localidades).
  deliveryCityId?: string | null;
  deliveryCityName?: string | null;
  // Entrega en "otra ubicación": la mensajería se cobró por km desde el centro del pueblo.
  deliveryElsewhere?: boolean;
  deliveryDistanceKm?: number | null;
  orderNumber: number;
  customerName: string;
  customerAddress: string;
  addressReference: string | null;
  customerPhone: string;
  deliveryFee: number;
  status: OrderStatus;
  orderDate: string;
  assignedAt: string | null;
  // Pausa interna del staff (nunca visible para el cliente): null = no está pausado.
  pausedAt?: string | null;
  pausedReason?: string | null;
  pausedByName?: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  /** Motivo que dio el mensajero al cancelar desde la app (null si no lo mandó o cancela el staff). */
  cancellationReason: string | null;
  delivererId: string | null;
  delivererName: string | null;
  registeredByUserId: string;
  registeredByName: string;
  raffleNumber: number | null;
  // Cliente registrado de la app vinculado a este pedido (ver "Vincular cuenta" en Nuevo/Editar
  // pedido) — null si es un pedido anónimo o todavía no se vinculó a nadie.
  customerId: string | null;
  // Campos que el backend ya manda y el dashboard usa en el PDF del pedido.
  source?: 'APP' | 'WEB' | 'MANUAL' | 'TELEGRAM';
  scheduledFor?: string | null;
  packagingTotal?: number;
  totalBeforeRedemption?: number;
  pointsRedeemed?: number;
  pointsDiscount?: number;
  lastEditedAt?: string | null;
  lastEditSummary?: OrderItemChangeDTO[] | null;
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

export type CustomerSortBy = 'orderCount' | 'totalSpent' | 'traeloContribution';

export interface CustomerReportDTO {
  customerPhone: string;
  customerName: string;
  orderCount: number;
  totalSpent: number;
  platformFeeContribution: number;
  traeloDeliveryShareContribution: number;
  traeloContributionTotal: number;
}

export interface TopProductDTO {
  businessId: string;
  businessName: string;
  productId: string | null;
  productName: string;
  quantity: number;
  totalSales: number;
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

export interface CustomerSegmentationDTO {
  newCustomers: number;
  recurringCustomers: number;
  totalCustomers: number;
  newCustomersRevenue: number;
  recurringCustomersRevenue: number;
}

export interface DemandByHourDTO {
  hour: number;
  orderCount: number;
  businessSalesGross: number;
}

export interface ProductByHourDTO {
  businessId: string;
  businessName: string;
  productId: string | null;
  productName: string;
  quantity: number;
  totalSales: number;
}

export interface CustomerTrendPointDTO {
  date: string;
  newCustomers: number;
  recurringCustomers: number;
  newRevenue: number;
  recurringRevenue: number;
  retentionRate: number;
}

export interface RetentionCohortDTO {
  cohortMonth: string;
  cohortSize: number;
  retention: (number | null)[];
}

export type OrdersTrendGranularity = 'day' | 'week' | 'month';

export interface OrdersTrendPointDTO {
  label: string;
  orderCount: number;
  businessSalesGross: number;
}

export interface OrdersTrendDTO {
  granularity: OrdersTrendGranularity;
  points: OrdersTrendPointDTO[];
}

// ── Analítica de comportamiento (eventos web/app) ────────────────────────

export interface AbandonedCartItemDTO {
  productId: string;
  businessId: string | null;
  quantity: number;
}

export interface AbandonedCartDTO {
  customerId: string | null;
  visitorId: string | null;
  // 'cart' = dejó productos en el carrito; 'checkout' = llegó a iniciar el checkout.
  stage: 'cart' | 'checkout';
  lastActivityAt: string;
  items: AbandonedCartItemDTO[];
  businessIds: string[];
  customer: { id: string; name: string; phone: string } | null;
}

export interface AbandonedCartsReportDTO {
  from: string;
  to: string;
  idleMinutes: number;
  // true = había más eventos que el tope que lee el backend por reporte: puede faltar alguno.
  truncated: boolean;
  total: number;
  carts: AbandonedCartDTO[];
}

// ── Comportamiento por ciudad (GET /behavior/insights) ───────────────────────

export interface InsightsSearchRowDTO {
  query: string;
  searches: number;
  visitors: number;
  withoutResults: number;
}

export interface InsightsBusinessRowDTO {
  businessId: string;
  name: string;
  cityName: string;
  views: number;
  searchClicks: number;
  visitors: number;
}

export interface InsightsProductRowDTO {
  productId: string;
  name: string;
  businessName: string;
  views: number;
  addToCart: number;
  searchClicks: number;
  visitors: number;
}

export interface InsightsPromoDTO {
  viewers: number;
  views: number;
  clickers: number;
  landed: number;
  orders: number;
  conversion: number | null;
}

export interface BehaviorInsightsDTO {
  from: string;
  to: string;
  // Ciudades que cubre el resumen. Vacío = todas.
  cities: { id: string; code: string; name: string }[];
  searches: {
    total: number;
    visitors: number;
    withoutResults: number;
    top: InsightsSearchRowDTO[];
    notFound: InsightsSearchRowDTO[];
  };
  businesses: InsightsBusinessRowDTO[];
  products: InsightsProductRowDTO[];
  // Solo viene cuando el resumen incluye San Antonio (o todas las ciudades).
  promo: InsightsPromoDTO | null;
}

// ── Clientes de la app (cuentas Customer) ────────────────────────────────────

export interface UserTypeCountDTO {
  role: Role;
  active: number;
  inactive: number;
}

export interface TopReferrerDTO {
  id: string;
  name: string;
  phone: string;
  referrals: number;
  converted: number;
  lastReferralAt: string;
}

export interface AppCustomersOverviewDTO {
  users: {
    staff: UserTypeCountDTO[];
    delivererProfiles: number;
    customers: number;
  };
  customers: {
    countedSince: string;
    total: number;
    excluded: number;
    withEmail: number;
    active: number;
    withPush: number;
    withFavorites: number;
    referred: number;
    withOrder: number;
    withCompletedOrder: number;
  };
  referrals: {
    allTime: { referred: number; organic: number; withReferralCode: number };
    period: {
      referred: number;
      organic: number;
      converted: number;
      activeReferrers: number;
    };
    top: TopReferrerDTO[];
  };
  period: {
    granularity: OrdersTrendGranularity;
    registered: number;
    series: { label: string; count: number }[];
    funnel: { registered: number; withOrder: number; withCompletedOrder: number };
    avgHoursToFirstOrder: number | null;
    medianHoursToFirstOrder: number | null;
  };
  orders: {
    total: number;
    appRegistered: number;
    appGuest: number;
    webRegistered: number;
    webGuest: number;
    telegram: number;
    manual: number;
    guestPeople: number;
    guestPeopleWithAccount: number;
  };
}

export type AppCustomerListFilter =
  | 'all'
  | 'with-order'
  | 'without-order'
  | 'excluded'
  | 'with-push';

export interface AppCustomerRowDTO {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  active: boolean;
  hasPassword: boolean;
  hasPush: boolean;
  orderCount: number;
  pointsBalance: number;
  lastOrderAt: string | null;
  createdAt: string;
}

/** Código de un solo uso para que un cliente restablezca su contraseña (lo genera el staff). */
export interface PasswordResetCodeDTO {
  /** "ABCD-EFGH": se muestra una sola vez. */
  code: string;
  expiresAt: string;
  expiresInMinutes: number;
  customer: { id: string; name: string; phone: string };
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
  completionRate: number;
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
  completionRate: number;
  averageTicket: number;
  topBusiness: TopBusinessDTO | null;
  topDeliverer: TopDelivererDTO | null;
}

// ── Notificaciones / difusiones ──────────────────────────────────────────

export const NotificationStatus = {
  DRAFT: 'DRAFT',
  SENDING: 'SENDING',
  SENT: 'SENT',
  PARTIALLY_SENT: 'PARTIALLY_SENT',
  FAILED: 'FAILED',
} as const;
export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus];

// V1: una sola audiencia (ver notifications.dto.ts del backend — el objeto, no un string suelto,
// deja lugar a BUSINESS_CUSTOMERS/INACTIVE_CUSTOMERS/AREA/POINTS/CUSTOM más adelante).
export type NotificationAudience = { type: 'ALL_CUSTOMERS' };

// A qué navega la app al tocar el push.
export type NotificationDestination =
  | { type: 'GENERAL' }
  | { type: 'BUSINESS'; businessId: string }
  | { type: 'PRODUCT'; productId: string }
  | { type: 'CATEGORY'; categoryId: string };

export interface NotificationDTO {
  id: string;
  title: string;
  body: string;
  audienceType: NotificationAudience['type'];
  data: NotificationDestination;
  status: NotificationStatus;
  targetedCount: number;
  sentCount: number;
  failedCount: number;
  createdById: string;
  createdByName: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemConfigDTO {
  id: string;
  defaultDelivererCommissionPercentage: number;
  rafflePromoText: string | null;
  raffleVideoUrl: string | null;
  // Horario global de pedidos. Las horas llegan como ISO anclado a 1970-01-01 UTC
  // ("1970-01-01T21:00:00.000Z" = 21:00 de La Habana): se leen con isoToTime.
  operatingHoursEnabled: boolean;
  operatingHoursStart: string | null;
  operatingHoursEnd: string | null;
  operatingHoursWeekendEnd: string | null;
  // Tráelo Familia (clientes en el exterior, pagan en USD vía Zelle) — tasa CUP por 1 USD que
  // usa el build del catálogo de ese sub-producto. Ver también Product.familiaOnly.
  familiaExchangeRate: number;
  updatedAt: string;
}

// ── Portal del dueño de negocio (/my-business) ───────────────────────────
// Nunca incluyen ganancias de Tráelo (comisión, Servicio Tráelo, reparto de mensajería) ni
// teléfono/dirección del cliente — el backend ni siquiera los envía a este rol.

export interface OwnerBusinessDTO {
  id: string;
  name: string;
  phone: string;
  address: string;
  joinedAt: string;
  active: boolean;
  acceptingOrders: boolean;
  logoUrl: string | null;
}

export interface OwnerSummaryDTO {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  completionRate: number;
  activeOrders: number;
  salesTotal: number;
  averageTicket: number;
  maxOrder: number;
  topProducts: { productName: string; quantity: number; totalSales: number }[];
}

export interface PortalOrderItemDTO {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface PortalOrderDTO {
  id: string;
  orderNumber: number;
  orderDate: string;
  completedAt: string | null;
  status: OrderStatus;
  customerName: string;
  delivererName: string | null;
  items: PortalOrderItemDTO[];
  subtotal: number;
}

export type PortalCustomerSortBy = 'orderCount' | 'totalSpent' | 'lastOrder';

export interface RecurringCustomerDTO {
  customerName: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string;
}
