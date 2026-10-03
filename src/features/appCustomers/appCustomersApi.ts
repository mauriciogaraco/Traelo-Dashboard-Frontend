import { baseApi } from '@/lib/baseApi';
import type {
  ApiOk,
  ApiPaginated,
  AppCustomerListFilter,
  AppCustomerRowDTO,
  AppCustomersOverviewDTO,
  DateRangePreset,
} from '@/lib/types';

export interface AppCustomersOverviewParams {
  range?: Exclude<DateRangePreset, 'custom'>;
}

export interface ListAppCustomersParams {
  page?: number;
  pageSize?: number;
  filter?: AppCustomerListFilter;
  search?: string;
}

export const appCustomersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAppCustomersOverview: builder.query<
      ApiOk<AppCustomersOverviewDTO>,
      AppCustomersOverviewParams | void
    >({
      query: (params) => ({ url: '/analytics/app-customers', params: params ?? undefined }),
    }),
    listAppCustomers: builder.query<ApiPaginated<AppCustomerRowDTO>, ListAppCustomersParams | void>({
      query: (params) => ({ url: '/analytics/app-customers/list', params: params ?? undefined }),
    }),
  }),
});

export const { useGetAppCustomersOverviewQuery, useListAppCustomersQuery } = appCustomersApi;
