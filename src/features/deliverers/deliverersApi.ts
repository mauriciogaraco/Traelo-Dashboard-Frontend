import { baseApi } from '@/lib/baseApi';
import type { ApiOk, ApiPaginated, DelivererDTO } from '@/lib/types';

export interface ListDeliverersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  // "active" solo admite el valor true: ver la misma nota en usersApi.ts.
  active?: true;
}

export interface CreateDelivererInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  joinedAt?: string;
  commissionPercentage?: number;
}

export interface UpdateDelivererInput {
  name?: string;
  phone?: string;
  active?: boolean;
  commissionPercentage?: number | null;
}

export const deliverersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listDeliverers: builder.query<ApiPaginated<DelivererDTO>, ListDeliverersParams | void>({
      query: (params) => ({ url: '/deliverers', params: params ?? undefined }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((d) => ({ type: 'Deliverer' as const, id: d.id })),
              { type: 'Deliverer' as const, id: 'LIST' },
            ]
          : [{ type: 'Deliverer' as const, id: 'LIST' }],
    }),
    createDeliverer: builder.mutation<ApiOk<DelivererDTO>, CreateDelivererInput>({
      query: (body) => ({ url: '/deliverers', method: 'POST', body }),
      invalidatesTags: [{ type: 'Deliverer', id: 'LIST' }],
    }),
    updateDeliverer: builder.mutation<
      ApiOk<DelivererDTO>,
      { id: string; body: UpdateDelivererInput }
    >({
      query: ({ id, body }) => ({ url: `/deliverers/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Deliverer', id },
        { type: 'Deliverer', id: 'LIST' },
      ],
    }),
    deactivateDeliverer: builder.mutation<ApiOk<DelivererDTO>, string>({
      query: (id) => ({ url: `/deliverers/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Deliverer', id },
        { type: 'Deliverer', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListDeliverersQuery,
  useCreateDelivererMutation,
  useUpdateDelivererMutation,
  useDeactivateDelivererMutation,
} = deliverersApi;
