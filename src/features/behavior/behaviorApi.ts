import { baseApi } from '@/lib/baseApi';
import type { AbandonedCartsReportDTO, ApiOk } from '@/lib/types';

export interface AbandonedCartsParams {
  from?: string;
  to?: string;
  idleMinutes?: number;
  limit?: number;
}

export const behaviorApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAbandonedCarts: builder.query<ApiOk<AbandonedCartsReportDTO>, AbandonedCartsParams | void>({
      query: (params) => ({ url: '/behavior/abandoned-carts', params: params ?? undefined }),
    }),
  }),
});

export const { useGetAbandonedCartsQuery } = behaviorApi;
