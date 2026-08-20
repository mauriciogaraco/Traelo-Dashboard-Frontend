import { baseApi } from '@/lib/baseApi';
import type {
  ApiOk,
  ApiPaginated,
  SettlementDTO,
  SettlementOrderDTO,
  SettlementStatus,
  SettlementType,
} from '@/lib/types';

export interface ListSettlementsParams {
  page?: number;
  pageSize?: number;
  delivererId?: string;
  type?: SettlementType;
  status?: SettlementStatus;
  // Filtra por cuadres cuyo periodo cae en "hoy" o "esta semana" (hora de La Habana).
  range?: 'today' | 'week';
}

export interface GenerateSettlementInput {
  delivererId: string;
  date?: string;
}

export const settlementsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listSettlements: builder.query<ApiPaginated<SettlementDTO>, ListSettlementsParams | void>({
      query: (params) => ({ url: '/settlements', params: params ?? undefined }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((s) => ({ type: 'Settlement' as const, id: s.id })),
              { type: 'Settlement' as const, id: 'LIST' },
            ]
          : [{ type: 'Settlement' as const, id: 'LIST' }],
    }),
    getSettlement: builder.query<ApiOk<SettlementDTO>, string>({
      query: (id) => `/settlements/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Settlement', id }],
    }),
    getSettlementOrders: builder.query<ApiOk<SettlementOrderDTO[]>, string>({
      query: (id) => `/settlements/${id}/orders`,
      providesTags: (_result, _error, id) => [{ type: 'Settlement', id: `${id}-ORDERS` }],
    }),
    generateDailySettlement: builder.mutation<ApiOk<SettlementDTO>, GenerateSettlementInput>({
      query: (body) => ({ url: '/settlements/daily/generate', method: 'POST', body }),
      invalidatesTags: [{ type: 'Settlement', id: 'LIST' }],
    }),
    generateWeeklySettlement: builder.mutation<ApiOk<SettlementDTO>, GenerateSettlementInput>({
      query: (body) => ({ url: '/settlements/weekly/generate', method: 'POST', body }),
      invalidatesTags: [{ type: 'Settlement', id: 'LIST' }],
    }),
    closeSettlement: builder.mutation<ApiOk<SettlementDTO>, string>({
      query: (id) => ({ url: `/settlements/${id}/close`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Settlement', id },
        { type: 'Settlement', id: 'LIST' },
      ],
    }),
    deleteSettlement: builder.mutation<void, string>({
      query: (id) => ({ url: `/settlements/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Settlement', id },
        { type: 'Settlement', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListSettlementsQuery,
  useGetSettlementQuery,
  useGetSettlementOrdersQuery,
  useGenerateDailySettlementMutation,
  useGenerateWeeklySettlementMutation,
  useCloseSettlementMutation,
  useDeleteSettlementMutation,
} = settlementsApi;
