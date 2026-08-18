import { baseApi } from '@/lib/baseApi';
import type { ApiOk, DashboardSummaryDTO, DateRangePreset } from '@/lib/types';

export interface DashboardSummaryParams {
  range?: Exclude<DateRangePreset, 'custom'>;
}

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardSummary: builder.query<ApiOk<DashboardSummaryDTO>, DashboardSummaryParams | void>({
      query: (params) => ({ url: '/dashboard/summary', params: params ?? undefined }),
    }),
  }),
});

export const { useGetDashboardSummaryQuery } = dashboardApi;
