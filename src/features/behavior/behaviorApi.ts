import { baseApi } from '@/lib/baseApi';
import type { AbandonedCartsReportDTO, ApiOk, BehaviorInsightsDTO } from '@/lib/types';

export interface AbandonedCartsParams {
  from?: string;
  to?: string;
  idleMinutes?: number;
  limit?: number;
}

export interface BehaviorInsightsParams {
  range?: 'today' | 'week' | 'month';
  limit?: number;
}

export const behaviorApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAbandonedCarts: builder.query<ApiOk<AbandonedCartsReportDTO>, AbandonedCartsParams | void>({
      query: (params) => ({ url: '/behavior/abandoned-carts', params: params ?? undefined }),
    }),
    // Qué buscan y qué abren, acotado por la ciudad del selector (baseApi manda ?cityId).
    getBehaviorInsights: builder.query<ApiOk<BehaviorInsightsDTO>, BehaviorInsightsParams | void>({
      query: (params) => ({ url: '/behavior/insights', params: params ?? undefined }),
    }),
  }),
});

export const { useGetAbandonedCartsQuery, useGetBehaviorInsightsQuery } = behaviorApi;
