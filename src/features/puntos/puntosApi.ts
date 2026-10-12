import { baseApi } from '@/lib/baseApi';
import type { ApiOk, ApiPaginated, DateRangePreset, PaginationQuery } from '@/lib/types';

export type PointsTransactionType =
  | 'ORDER_COMPLETED'
  | 'ORDER_ADJUSTMENT'
  | 'FIRST_ORDER_BONUS'
  | 'REDEMPTION'
  | 'REDEMPTION_REFUND'
  | 'REFERRAL_REWARD';

export interface PointsByTypeRow {
  type: PointsTransactionType;
  points: number;
  count: number;
}

export interface TopPointsCustomerDTO {
  id: string;
  name: string;
  phone: string;
  pointsBalance: number;
  lastOrderAt: string | null;
}

export interface PointsOverviewDTO {
  range: { from: string; to: string };
  issued: { total: number };
  redeemed: { total: number };
  net: number;
  bySource: { compras: number; referidos: number };
  byType: PointsByTypeRow[];
  outstanding: { totalBalance: number; customersWithBalance: number };
  topCustomers: TopPointsCustomerDTO[];
}

export interface PointsOverviewParams {
  range?: Exclude<DateRangePreset, 'custom'>;
  limit?: number;
}

export interface PointsRedemptionDTO {
  id: string;
  customerName: string;
  customerPhone: string;
  rewardName: string;
  pointsCost: number;
  moneyValue: number;
  status: 'APPLIED' | 'REFUNDED';
  orderNumber: number;
  createdAt: string;
  refundedAt: string | null;
}

export const puntosApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPointsOverview: builder.query<ApiOk<PointsOverviewDTO>, PointsOverviewParams | void>({
      query: (params) => ({ url: '/loyalty/points/overview', params: params ?? undefined }),
    }),
    listPointsRedemptions: builder.query<ApiPaginated<PointsRedemptionDTO>, PaginationQuery | void>({
      query: (params) => ({ url: '/loyalty/points/redemptions', params: params ?? undefined }),
    }),
  }),
});

export const { useGetPointsOverviewQuery, useListPointsRedemptionsQuery } = puntosApi;
