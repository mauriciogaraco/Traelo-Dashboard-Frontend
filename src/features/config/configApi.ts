import { baseApi } from '@/lib/baseApi';
import type { ApiOk, SystemConfigDTO } from '@/lib/types';

export interface UpdateSystemConfigInput {
  defaultDelivererCommissionPercentage?: number;
  rafflePromoText?: string | null;
  raffleVideoUrl?: string | null;
}

export const configApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getConfig: builder.query<ApiOk<SystemConfigDTO>, void>({
      query: () => '/config',
      providesTags: ['Config'],
    }),
    updateConfig: builder.mutation<ApiOk<SystemConfigDTO>, UpdateSystemConfigInput>({
      query: (body) => ({ url: '/config', method: 'PATCH', body }),
      invalidatesTags: ['Config'],
    }),
  }),
});

export const { useGetConfigQuery, useUpdateConfigMutation } = configApi;
