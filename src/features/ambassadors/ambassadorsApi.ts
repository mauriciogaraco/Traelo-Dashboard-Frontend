import { baseApi } from '@/lib/baseApi';
import type { ApiOk } from '@/lib/types';

export type AmbassadorTier = 'AMBASSADOR' | 'SPECIAL';

export interface AmbassadorDTO {
  customerId: string;
  name: string;
  phone: string;
  email: string | null;
  pointsBalance: number;
  referralCode: string | null;
  tier: AmbassadorTier;
  /** El nivel que se muestra hoy (un especial vencido se ve como embajador). */
  effectiveTier: AmbassadorTier;
  specialStartsAt: string | null;
  specialEndsAt: string | null;
  specialAllOrders: boolean;
  specialPointsPerOrder: number;
  /** Especial y dentro de su periodo: hoy recibe puntos por pedido. */
  specialActive: boolean;
  totalReferred: number;
  /** Referidos que ya completaron su primera compra. */
  completedReferred: number;
  nextMilestoneAt: number;
  milestoneBonuses: number;
  milestonePointsEarned: number;
  specialPointsEarned: number;
  adjustedPoints: number;
  createdAt: string;
}

export interface AmbassadorTransactionDTO {
  id: string;
  type: 'AMBASSADOR_MILESTONE' | 'AMBASSADOR_SPECIAL' | 'AMBASSADOR_ADJUSTMENT';
  points: number;
  balanceAfter: number;
  reason: string;
  orderNumber: number | null;
  createdAt: string;
}

export interface AmbassadorDetailDTO {
  ambassador: AmbassadorDTO;
  transactions: AmbassadorTransactionDTO[];
}

export interface AmbassadorInput {
  tier?: AmbassadorTier;
  specialStartsAt?: string | null;
  specialEndsAt?: string | null;
  specialAllOrders?: boolean;
  specialPointsPerOrder?: number;
}

export const ambassadorsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listAmbassadors: builder.query<ApiOk<AmbassadorDTO[]>, void>({
      query: () => '/ambassadors',
      providesTags: [{ type: 'Ambassador' as const, id: 'LIST' }],
    }),
    getAmbassador: builder.query<ApiOk<AmbassadorDetailDTO>, string>({
      query: (customerId) => `/ambassadors/${customerId}`,
      providesTags: (_r, _e, customerId) => [{ type: 'Ambassador' as const, id: customerId }],
    }),
    grantAmbassador: builder.mutation<
      ApiOk<AmbassadorDetailDTO>,
      AmbassadorInput & { customerId: string; tier: AmbassadorTier }
    >({
      query: (body) => ({ url: '/ambassadors', method: 'POST', body }),
      invalidatesTags: [{ type: 'Ambassador', id: 'LIST' }],
    }),
    updateAmbassador: builder.mutation<
      ApiOk<AmbassadorDetailDTO>,
      { customerId: string; body: AmbassadorInput }
    >({
      query: ({ customerId, body }) => ({ url: `/ambassadors/${customerId}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { customerId }) => [
        { type: 'Ambassador', id: 'LIST' },
        { type: 'Ambassador', id: customerId },
      ],
    }),
    revokeAmbassador: builder.mutation<void, string>({
      query: (customerId) => ({ url: `/ambassadors/${customerId}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Ambassador', id: 'LIST' }],
    }),
    adjustAmbassadorPoints: builder.mutation<
      ApiOk<AmbassadorDetailDTO>,
      { customerId: string; points: number; reason: string }
    >({
      query: ({ customerId, ...body }) => ({
        url: `/ambassadors/${customerId}/adjust-points`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { customerId }) => [
        { type: 'Ambassador', id: 'LIST' },
        { type: 'Ambassador', id: customerId },
      ],
    }),
  }),
});

export const {
  useListAmbassadorsQuery,
  useGetAmbassadorQuery,
  useGrantAmbassadorMutation,
  useUpdateAmbassadorMutation,
  useRevokeAmbassadorMutation,
  useAdjustAmbassadorPointsMutation,
} = ambassadorsApi;
