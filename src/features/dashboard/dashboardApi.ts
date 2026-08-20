import { baseApi } from '@/lib/baseApi';
import type { ApiOk, DashboardSummaryDTO, DateRangePreset, DelivererDashboardSummaryDTO } from '@/lib/types';

export interface DashboardSummaryParams {
  range?: Exclude<DateRangePreset, 'custom'>;
}

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // El backend devuelve un shape reducido (sin ganancias totales de Tráelo) cuando quien pide
    // es un mensajero — por eso el tipo de respuesta es una unión, no siempre DashboardSummaryDTO.
    getDashboardSummary: builder.query<
      ApiOk<DashboardSummaryDTO | DelivererDashboardSummaryDTO>,
      DashboardSummaryParams | void
    >({
      query: (params) => ({ url: '/dashboard/summary', params: params ?? undefined }),
    }),
  }),
});

export const { useGetDashboardSummaryQuery } = dashboardApi;
