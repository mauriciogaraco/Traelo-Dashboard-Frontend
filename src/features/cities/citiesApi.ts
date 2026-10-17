import { baseApi } from '@/lib/baseApi';
import type { ApiOk, ApiPaginated, CityConfigDTO, CityDTO } from '@/lib/types';

export interface ListCitiesParams {
  page?: number;
  pageSize?: number;
  active?: true;
}

export interface CityConfigInput {
  acceptingOrders?: boolean;
  operatingHoursEnabled?: boolean;
  // "HH:mm" (hora de La Habana) o null para limpiar.
  operatingHoursStart?: string | null;
  operatingHoursEnd?: string | null;
  operatingHoursWeekendEnd?: string | null;
  operationalMessage?: string | null;
  chargePlatformFee?: boolean;
}

export const citiesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Solo OWNER/ADMIN/EMPLOYEE (ver cities.routes.ts en el backend). Devuelve TODAS las
    // ciudades, no las autorizadas del usuario actual (eso viene en auth.user.cities) — se usa
    // para selectores de alta/edición (negocio, mensajero), no para el scope de quien lo pide.
    listCities: builder.query<ApiPaginated<CityDTO>, ListCitiesParams | void>({
      query: (params) => ({ url: '/cities', params: params ?? undefined }),
      providesTags: [{ type: 'City' as const, id: 'LIST' }],
    }),
    createCity: builder.mutation<ApiOk<CityDTO>, { name: string; code: string }>({
      query: (body) => ({ url: '/cities', method: 'POST', body }),
      invalidatesTags: [{ type: 'City', id: 'LIST' }],
    }),
    updateCity: builder.mutation<
      ApiOk<CityDTO>,
      { id: string; body: { name?: string; active?: boolean } }
    >({
      query: ({ id, body }) => ({ url: `/cities/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'City', id: 'LIST' }],
    }),
    getCityConfig: builder.query<ApiOk<CityConfigDTO>, string>({
      query: (id) => `/cities/${id}/config`,
      providesTags: (_r, _e, id) => [{ type: 'City' as const, id: `CONFIG-${id}` }],
    }),
    updateCityConfig: builder.mutation<
      ApiOk<CityConfigDTO>,
      { id: string; body: CityConfigInput }
    >({
      query: ({ id, body }) => ({ url: `/cities/${id}/config`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'City', id: `CONFIG-${id}` }],
    }),
  }),
});

export const {
  useListCitiesQuery,
  useCreateCityMutation,
  useUpdateCityMutation,
  useGetCityConfigQuery,
  useUpdateCityConfigMutation,
} = citiesApi;
