import { baseApi } from '@/lib/baseApi';
import type { ApiOk, ApiPaginated, PaginationQuery } from '@/lib/types';

export type StaffNotificationType = 'ORDER_VOUCHER_EDITED' | 'ORDER_CANCELLED_BY_DELIVERER';

export interface StaffNotificationDTO {
  id: string;
  type: StaffNotificationType;
  title: string;
  body: string;
  orderId: string | null;
  delivererId: string | null;
  /** Detalle estructurado del aviso (cambios del vale, totales…); la forma depende de `type`. */
  data: Record<string, unknown> | null;
  createdAt: string;
  /** Estado de lectura del usuario actual: cada quien tiene el suyo. */
  read: boolean;
}

export const staffInboxApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listStaffNotifications: builder.query<ApiPaginated<StaffNotificationDTO>, PaginationQuery | void>({
      query: (params) => ({ url: '/staff-notifications', params: params ?? undefined }),
      providesTags: ['StaffInbox'],
    }),
    getStaffUnreadCount: builder.query<ApiOk<{ count: number }>, void>({
      query: () => '/staff-notifications/unread-count',
      providesTags: ['StaffInbox'],
    }),
    markStaffNotificationRead: builder.mutation<ApiOk<{ id: string; read: true }>, string>({
      query: (id) => ({ url: `/staff-notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['StaffInbox'],
    }),
    markAllStaffNotificationsRead: builder.mutation<ApiOk<{ marked: number }>, void>({
      query: () => ({ url: '/staff-notifications/read-all', method: 'POST' }),
      invalidatesTags: ['StaffInbox'],
    }),
  }),
});

export const {
  useListStaffNotificationsQuery,
  useGetStaffUnreadCountQuery,
  useMarkStaffNotificationReadMutation,
  useMarkAllStaffNotificationsReadMutation,
} = staffInboxApi;
