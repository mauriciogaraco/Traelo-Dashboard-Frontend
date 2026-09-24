import { baseApi } from '@/lib/baseApi';
import type { ApiOk, ApiPaginated, NotificationAudience, NotificationDestination, NotificationDTO } from '@/lib/types';

export interface ListNotificationsParams {
  page?: number;
  pageSize?: number;
}

export interface CreateNotificationInput {
  title: string;
  body: string;
  audience: NotificationAudience;
  data: NotificationDestination;
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listNotifications: builder.query<ApiPaginated<NotificationDTO>, ListNotificationsParams | void>({
      query: (params) => ({ url: '/notifications', params: params ?? undefined }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((n) => ({ type: 'Notification' as const, id: n.id })),
              { type: 'Notification' as const, id: 'LIST' },
            ]
          : [{ type: 'Notification' as const, id: 'LIST' }],
    }),
    createNotification: builder.mutation<ApiOk<NotificationDTO>, CreateNotificationInput>({
      query: (body) => ({ url: '/notifications', method: 'POST', body }),
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
  }),
});

export const { useListNotificationsQuery, useCreateNotificationMutation } = notificationsApi;
