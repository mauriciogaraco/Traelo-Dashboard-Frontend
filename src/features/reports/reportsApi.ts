import { baseApi } from '@/lib/baseApi';
import type {
  ApiOk,
  ApiPaginated,
  BusinessDelivererBreakdownDTO,
  BusinessSalesDetailDTO,
  CustomerReportDTO,
  CustomerSortBy,
  DateRangePreset,
  SalesReportDTO,
  TopBusinessDTO,
  TopDelivererDTO,
  TopProductDTO,
} from '@/lib/types';

export interface ReportsRangeParams {
  range?: Exclude<DateRangePreset, 'custom'>;
}

export interface TopReportsParams extends ReportsRangeParams {
  limit?: number;
}

export interface TopCustomersParams extends ReportsRangeParams {
  limit?: number;
  sortBy?: CustomerSortBy;
}

export interface ListReportsParams extends ReportsRangeParams {
  page?: number;
  pageSize?: number;
  search?: string;
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
    listReportBusinesses: builder.query<ApiPaginated<TopBusinessDTO>, ListReportsParams | void>({
      query: (params) => ({ url: '/reports/businesses', params: params ?? undefined }),
    }),
    getBusinessSalesDetail: builder.query<
      ApiOk<BusinessSalesDetailDTO>,
      { businessId: string; range?: ReportsRangeParams['range'] }
    >({
      query: ({ businessId, range }) => ({
        url: `/reports/businesses/${businessId}`,
        params: range ? { range } : undefined,
      }),
    }),
    listReportDeliverers: builder.query<ApiPaginated<TopDelivererDTO>, ListReportsParams | void>({
      query: (params) => ({ url: '/reports/deliverers', params: params ?? undefined }),
    }),
    getDelivererSalesDetail: builder.query<
      ApiOk<TopDelivererDTO>,
      { delivererId: string; range?: ReportsRangeParams['range'] }
    >({
      query: ({ delivererId, range }) => ({
        url: `/reports/deliverers/${delivererId}`,
        params: range ? { range } : undefined,
      }),
    }),
    getBusinessBreakdownByDeliverer: builder.query<
      ApiOk<BusinessDelivererBreakdownDTO[]>,
      { businessId: string; range?: ReportsRangeParams['range'] }
    >({
      query: ({ businessId, range }) => ({
        url: `/reports/businesses/${businessId}/by-deliverer`,
        params: range ? { range } : undefined,
      }),
    }),
    getTopCustomers: builder.query<ApiOk<CustomerReportDTO[]>, TopCustomersParams | void>({
      query: (params) => ({ url: '/reports/customers', params: params ?? undefined }),
    }),
    getTopProducts: builder.query<ApiOk<TopProductDTO[]>, TopReportsParams | void>({
      query: (params) => ({ url: '/reports/top-products', params: params ?? undefined }),
    }),
  }),
});

export const {
  useGetSalesReportQuery,
  useGetTopBusinessesQuery,
  useGetTopDeliverersQuery,
  useListReportBusinessesQuery,
  useGetBusinessSalesDetailQuery,
  useListReportDeliverersQuery,
  useGetDelivererSalesDetailQuery,
  useGetBusinessBreakdownByDelivererQuery,
  useGetTopCustomersQuery,
  useGetTopProductsQuery,
} = reportsApi;
