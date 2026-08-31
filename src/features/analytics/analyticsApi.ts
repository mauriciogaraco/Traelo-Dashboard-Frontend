import { baseApi } from '@/lib/baseApi';
import type {
  ApiOk,
  CustomerSegmentationDTO,
  DateRangePreset,
  DemandByHourDTO,
  ProductByHourDTO,
} from '@/lib/types';

export interface AnalyticsRangeParams {
  range?: Exclude<DateRangePreset, 'custom'>;
}

export interface ProductsByHourParams extends AnalyticsRangeParams {
  hour: number;
  limit?: number;
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
  }),
});

export const {
  useGetCustomerSegmentationQuery,
  useGetDemandByHourQuery,
  useGetProductsByHourQuery,
} = analyticsApi;
