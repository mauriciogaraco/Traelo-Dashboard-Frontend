import { baseApi } from '@/lib/baseApi';
import type {
  ApiOk,
  DateRangePreset,
  SalesReportDTO,
  TopBusinessDTO,
  TopDelivererDTO,
} from '@/lib/types';

export interface ReportsRangeParams {
  range?: Exclude<DateRangePreset, 'custom'>;
}

export interface TopReportsParams extends ReportsRangeParams {
  limit?: number;
}

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSalesReport: builder.query<ApiOk<SalesReportDTO>, ReportsRangeParams | void>({
      query: (params) => ({ url: '/reports/sales', params: params ?? undefined }),
    }),
    getTopBusinesses: builder.query<ApiOk<TopBusinessDTO[]>, TopReportsParams | void>({
      query: (params) => ({ url: '/reports/top-businesses', params: params ?? undefined }),
    }),
    getTopDeliverers: builder.query<ApiOk<TopDelivererDTO[]>, TopReportsParams | void>({
      query: (params) => ({ url: '/reports/top-deliverers', params: params ?? undefined }),
    }),
  }),
});

export const { useGetSalesReportQuery, useGetTopBusinessesQuery, useGetTopDeliverersQuery } =
  reportsApi;
