import { baseApi } from '@/lib/baseApi';
import type { ApiOk, ApiPaginated, OrderDTO, OrderStatus } from '@/lib/types';

export type DateRangePreset = 'today' | 'week' | 'month' | '6months' | 'year' | 'custom';

export interface ListOrdersParams {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  delivererId?: string;
  businessId?: string;
  search?: string;
  // Atajo (hoy/semana/mes/semestre/año); omitilo junto con from/to para ver todos los pedidos.
  range?: DateRangePreset;
  from?: string;
  to?: string;
}

export interface CreateOrderItemInput {
  productId?: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  // Variantes ya resueltas por quien arma el pedido (el backend no las recalcula): tipo/sabor, agrego
  // (precio POR UNIDAD, ya sumado en unitPrice), envase (costo total de la línea) y unidades por caja.
  optionName?: string;
  addonName?: string;
  addonPrice?: number;
  packagingName?: string;
  packagingFee?: number;
  unitsPerPack?: number;
}

export interface CreateOrderBusinessInput {
  businessId: string;
  items: CreateOrderItemInput[];
}

export interface CreateOrderInput {
  customerName: string;
  customerAddress: string;
  addressReference?: string;
  customerPhone: string;
  deliveryFee: number;
  // Anula el Servicio Tráelo calculado automáticamente (p.ej. 0 si no se cobró en este pedido).
  // Si se omite, el backend lo calcula solo a partir de la comisión de cada negocio.
  platformFeeOverride?: number;
  // "🎟️ Número del Sorteo" del vale, cuando el pedido participa de una promoción vigente.
  raffleNumber?: number;
  // Avisos para el mensajero (ver OrderDTO.customerConfirmed / orderedWithBusiness / inviteToApp).
  customerConfirmed?: boolean;
  orderedWithBusiness?: boolean;
  inviteToApp?: boolean;
  // Cliente registrado de la app vinculado a este pedido manual (ver "Vincular cuenta" en el
  // formulario) — hace que el pedido cuente para puntos como si lo hubiera hecho el propio
  // cliente. Solo se manda cuando el staff confirmó que el teléfono buscado es esta cuenta.
  customerId?: string;
  businesses: CreateOrderBusinessInput[];
}

export interface CustomerLookupDTO {
  id: string;
  name: string;
  phone: string;
  pointsBalance: number;
}

// Fusión de pedidos: el mismo teléfono pidió otra vez a los pocos minutos y el staff decide.
export interface MergePreview {
  productsTotal: number;
  deliveryFee: number;
  platformFee: number;
  total: number;
  separateDeliveryFees: number;
  separateTotals: number;
}

export interface MergeSuggestion {
  /** El pedido NUEVO (el que se absorbería). */
  newOrder: OrderDTO;
  /** El pedido anterior del mismo teléfono (el vale que quedaría). */
  targetOrder: OrderDTO;
  preview: MergePreview | null;
  canMerge: boolean;
  blockedReason: string | null;
  waitingSince: string;
}

export type MergeDecision = 'MERGE' | 'SEPARATE';

export interface BulkCompleteOrdersResult {
  completed: OrderDTO[];
  skipped: { id: string; reason: string }[];
}

export interface UpdateOrderInput {
  customerName?: string;
  customerAddress?: string;
  addressReference?: string;
  customerPhone?: string;
  deliveryFee?: number;
  platformFeeOverride?: number;
  raffleNumber?: number | null;
  customerConfirmed?: boolean;
  orderedWithBusiness?: boolean;
  inviteToApp?: boolean;
  // Reemplaza por completo los negocios/productos del pedido. Si se omite, no se tocan.
  businesses?: CreateOrderBusinessInput[];
  // Vincular un cliente registrado que no se vinculó al crear el pedido — solo si el pedido
  // todavía no tiene uno (es de una sola vez, ver orders.service.updateOrder en el backend).
  customerId?: string;
}

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listOrders: builder.query<ApiPaginated<OrderDTO>, ListOrdersParams | void>({
      query: (params) => ({ url: '/orders', params: params ?? undefined }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((o) => ({ type: 'Order' as const, id: o.id })),
              { type: 'Order' as const, id: 'LIST' },
            ]
          : [{ type: 'Order' as const, id: 'LIST' }],
    }),
    getOrder: builder.query<ApiOk<OrderDTO>, string>({
      query: (id) => `/orders/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),
    createOrder: builder.mutation<ApiOk<OrderDTO>, CreateOrderInput>({
      query: (body) => ({ url: '/orders', method: 'POST', body }),
      invalidatesTags: [{ type: 'Order', id: 'LIST' }],
    }),
    // "Nuevo pedido" → vincular cuenta: ¿ese teléfono es de un cliente registrado?
    lookupCustomerByPhone: builder.query<ApiOk<CustomerLookupDTO | null>, string>({
      query: (phone) => ({ url: '/orders/customer-lookup', params: { phone } }),
    }),
    updateOrder: builder.mutation<ApiOk<OrderDTO>, { id: string; body: UpdateOrderInput }>({
      query: ({ id, body }) => ({ url: `/orders/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Order', id },
        { type: 'Order', id: 'LIST' },
      ],
    }),
    assignOrder: builder.mutation<ApiOk<OrderDTO>, { id: string; delivererId: string }>({
      query: ({ id, delivererId }) => ({
        url: `/orders/${id}/assign`,
        method: 'PATCH',
        body: { delivererId },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Order', id },
        { type: 'Order', id: 'LIST' },
      ],
    }),
    // "Pasar pedido": el staff lo pasa al siguiente mensajero de la cola (solo mientras está por confirmar).
    passOrder: builder.mutation<ApiOk<OrderDTO>, string>({
      query: (id) => ({ url: `/orders/${id}/pass`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Order', id },
        { type: 'Order', id: 'LIST' },
      ],
    }),
    // Pausa interna: el pedido deja de tapar el turno del mensajero en la cola (solo staff, y solo
    // mientras el mensajero aún no salió hacia el cliente).
    pauseOrder: builder.mutation<ApiOk<OrderDTO>, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/orders/${id}/pause`,
        method: 'PATCH',
        body: reason ? { reason } : {},
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Order', id },
        { type: 'Order', id: 'LIST' },
      ],
    }),
    unpauseOrder: builder.mutation<ApiOk<OrderDTO>, string>({
      query: (id) => ({ url: `/orders/${id}/unpause`, method: 'PATCH' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Order', id },
        { type: 'Order', id: 'LIST' },
      ],
    }),
    updateOrderStatus: builder.mutation<
      ApiOk<OrderDTO>,
      { id: string; status: 'CONFIRMED' | 'HEADING_OUT' | 'COMPLETED' | 'CANCELLED' }
    >({
      query: ({ id, status }) => ({
        url: `/orders/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Order', id },
        { type: 'Order', id: 'LIST' },
      ],
    }),
    deleteOrder: builder.mutation<void, string>({
      query: (id) => ({ url: `/orders/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Order', id },
        { type: 'Order', id: 'LIST' },
      ],
    }),
    listMergeSuggestions: builder.query<ApiOk<MergeSuggestion[]>, void>({
      query: () => '/orders/merge-suggestions',
      providesTags: [{ type: 'Order' as const, id: 'MERGE' }],
    }),
    resolveMergeDecision: builder.mutation<
      ApiOk<{ decision: MergeDecision; order: OrderDTO }>,
      { id: string; decision: MergeDecision }
    >({
      query: ({ id, decision }) => ({ url: `/orders/${id}/merge-decision`, method: 'POST', body: { decision } }),
      invalidatesTags: [
        { type: 'Order', id: 'MERGE' },
        { type: 'Order', id: 'LIST' },
      ],
    }),
    bulkCompleteOrders: builder.mutation<ApiOk<BulkCompleteOrdersResult>, string[]>({
      query: (ids) => ({ url: '/orders/bulk/complete', method: 'PATCH', body: { ids } }),
      invalidatesTags: (result) =>
        result
          ? [
              ...result.data.completed.map((o) => ({ type: 'Order' as const, id: o.id })),
              { type: 'Order' as const, id: 'LIST' },
            ]
          : [{ type: 'Order' as const, id: 'LIST' }],
    }),
  }),
});

export const {
  useListMergeSuggestionsQuery,
  useResolveMergeDecisionMutation,
  useListOrdersQuery,
  useLazyListOrdersQuery,
  useGetOrderQuery,
  useLazyLookupCustomerByPhoneQuery,
  useCreateOrderMutation,
  useUpdateOrderMutation,
  useAssignOrderMutation,
  usePassOrderMutation,
  usePauseOrderMutation,
  useUnpauseOrderMutation,
  useUpdateOrderStatusMutation,
  useDeleteOrderMutation,
  useBulkCompleteOrdersMutation,
} = ordersApi;
