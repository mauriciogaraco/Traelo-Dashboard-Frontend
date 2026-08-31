import { baseApi } from '@/lib/baseApi';
import type {
  ApiOk,
  CustomerSegmentationDTO,
  CustomerTrendPointDTO,
  DateRangePreset,
  DemandByHourDTO,
  ProductByHourDTO,
  RetentionCohortDTO,
} from '@/lib/types';

export interface AnalyticsRangeParams {
  range?: Exclude<DateRangePreset, 'custom'>;
}

export interface ProductsByHourParams extends AnalyticsRangeParams {
  hour: number;
  limit?: number;
}

export interface RetentionCohortsParams {
  months?: number;
}

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomerSegmentation: builder.query<
      ApiOk<CustomerSegmentationDTO>,
      AnalyticsRangeParams | void
    >({
      query: (params) => ({ url: '/analytics/customers', params: params ?? undefined }),
    }),
    getDemandByHour: builder.query<ApiOk<DemandByHourDTO[]>, AnalyticsRangeParams | void>({
      query: (params) => ({ url: '/analytics/demand-by-hour', params: params ?? undefined }),
    }),
    getProductsByHour: builder.query<ApiOk<ProductByHourDTO[]>, ProductsByHourParams>({
      query: (params) => ({ url: '/analytics/products-by-hour', params }),
    }),
    getCustomerTrend: builder.query<ApiOk<CustomerTrendPointDTO[]>, AnalyticsRangeParams | void>({
      query: (params) => ({ url: '/analytics/customer-trend', params: params ?? undefined }),
    }),
    getRetentionCohorts: builder.query<ApiOk<RetentionCohortDTO[]>, RetentionCohortsParams | void>(
      {
        query: (params) => ({ url: '/analytics/retention-cohorts', params: params ?? undefined }),
      },
    ),
  }),
});

export const {
  useGetCustomerSegmentationQuery,
  useGetDemandByHourQuery,
  useGetProductsByHourQuery,
  useGetCustomerTrendQuery,
  useGetRetentionCohortsQuery,
} = analyticsApi;
