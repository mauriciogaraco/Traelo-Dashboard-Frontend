import { baseApi } from '@/lib/baseApi';
import type { ApiOk, ApiPaginated } from '@/lib/types';

export type FamiliaStatus = 'PENDING' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED';
export type FamiliaZone = 'GUIRA' | 'SAN_ANTONIO' | 'OTHER';

export interface FamiliaOrderItemDTO {
  id: string;
  productRef: string;
  productName: string;
  businessName: string;
  optionName: string | null;
  addonName: string | null;
  packagingName: string | null;
  quantity: number;
  pack: number;
  lineTotalUsd: number;
}

export interface FamiliaOrderDTO {
  id: string;
  orderNumber: number;
  clientOrderId: string;
  status: FamiliaStatus;
  buyerName: string;
  buyerWhatsapp: string;
  recipientName: string;
  zone: FamiliaZone;
  place: string | null;
  city: { id: string; name: string } | null;
  address: string;
  notes: string | null;
  subtotalUsd: number;
  zelleFeeUsd: number;
  totalUsd: number;
  deliverer: { id: string; name: string; phone: string | null } | null;
  assignedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  // CUP que se le pagó al mensajero (solo cuando está completado).
  delivererPayment: number | null;
  items: FamiliaOrderItemDTO[];
  createdAt: string;
}

export type FamiliaCounts = Record<FamiliaStatus, number>;

export interface ListFamiliaOrdersParams {
  page?: number;
  pageSize?: number;
  status?: FamiliaStatus;
  search?: string;
}

export const familiaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listFamiliaOrders: builder.query<ApiPaginated<FamiliaOrderDTO>, ListFamiliaOrdersParams | void>({
      query: (params) => ({ url: '/familia-orders', params: params ?? undefined }),
      providesTags: [{ type: 'FamiliaOrder' as const, id: 'LIST' }],
    }),
    familiaCounts: builder.query<ApiOk<FamiliaCounts>, void>({
      query: () => '/familia-orders/counts',
      providesTags: [{ type: 'FamiliaOrder' as const, id: 'COUNTS' }],
    }),
    // Asigna (o reasigna) el mensajero A MANO: no pasa por la cola ni le llega nada a su app.
    assignFamiliaOrder: builder.mutation<ApiOk<FamiliaOrderDTO>, { id: string; delivererId: string }>({
      query: ({ id, delivererId }) => ({ url: `/familia-orders/${id}/assign`, method: 'POST', body: { delivererId } }),
      invalidatesTags: [{ type: 'FamiliaOrder', id: 'LIST' }, { type: 'FamiliaOrder', id: 'COUNTS' }],
    }),
    // Completa el pedido y registra lo que se le pagó al mensajero (CUP).
    completeFamiliaOrder: builder.mutation<ApiOk<FamiliaOrderDTO>, { id: string; delivererPayment: number }>({
      query: ({ id, delivererPayment }) => ({
        url: `/familia-orders/${id}/complete`,
        method: 'POST',
        body: { delivererPayment },
      }),
      invalidatesTags: [{ type: 'FamiliaOrder', id: 'LIST' }, { type: 'FamiliaOrder', id: 'COUNTS' }],
    }),
    cancelFamiliaOrder: builder.mutation<ApiOk<FamiliaOrderDTO>, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/familia-orders/${id}/cancel`,
        method: 'POST',
        body: reason ? { reason } : {},
      }),
      invalidatesTags: [{ type: 'FamiliaOrder', id: 'LIST' }, { type: 'FamiliaOrder', id: 'COUNTS' }],
    }),
  }),
});

export const {
  useListFamiliaOrdersQuery,
  useFamiliaCountsQuery,
  useAssignFamiliaOrderMutation,
  useCompleteFamiliaOrderMutation,
  useCancelFamiliaOrderMutation,
} = familiaApi;
