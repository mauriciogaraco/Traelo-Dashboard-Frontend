import { baseApi } from '@/lib/baseApi';
import type { ApiOk, ApiPaginated } from '@/lib/types';

// Negocios del sistema POS (independientes del catálogo: `linkedBusiness` es opcional).
export interface PosBusinessDTO {
  id: string;
  name: string;
  status: 'active' | 'suspended';
  cityId: string | null;
  cityName: string | null;
  phone: string | null;
  address: string | null;
  linkedBusiness: { id: string; name: string } | null;
  subscription: {
    planCode: string;
    status: 'active' | 'cancelled' | 'expired';
    startsAt: string;
    endsAt: string;
  } | null;
  activeDevices: number;
  createdAt: string;
}

export interface ListPosBusinessesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  cityId?: string;
  status?: 'active' | 'suspended';
}

export interface CreatePosBusinessInput {
  name: string;
  cityId: string;
  phone?: string;
  address?: string;
  // Opcional: enlaza con un negocio del catálogo cuando coinciden.
  businessId?: string;
  planCode?: string;
  durationDays?: number;
}

export const posApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listPosBusinesses: builder.query<ApiPaginated<PosBusinessDTO>, ListPosBusinessesParams>({
      query: (params) => ({ url: '/pos/admin/businesses', params }),
      providesTags: [{ type: 'PosBusiness', id: 'LIST' }],
    }),
    createPosBusiness: builder.mutation<ApiOk<PosBusinessDTO>, CreatePosBusinessInput>({
      query: (body) => ({ url: '/pos/admin/businesses', method: 'POST', body }),
      invalidatesTags: [{ type: 'PosBusiness', id: 'LIST' }],
    }),
  }),
});

export const { useListPosBusinessesQuery, useCreatePosBusinessMutation } = posApi;
