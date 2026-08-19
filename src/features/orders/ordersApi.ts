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
  businesses: CreateOrderBusinessInput[];
}

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
  // Reemplaza por completo los negocios/productos del pedido. Si se omite, no se tocan.
  businesses?: CreateOrderBusinessInput[];
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
    updateOrderStatus: builder.mutation<
      ApiOk<OrderDTO>,
      { id: string; status: 'COMPLETED' | 'CANCELLED' }
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
  useListOrdersQuery,
  useGetOrderQuery,
  useCreateOrderMutation,
  useUpdateOrderMutation,
  useAssignOrderMutation,
  useUpdateOrderStatusMutation,
  useDeleteOrderMutation,
  useBulkCompleteOrdersMutation,
} = ordersApi;
