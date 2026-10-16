import { baseApi } from '@/lib/baseApi';
import type { ApiPaginated, CityDTO } from '@/lib/types';

export interface ListCitiesParams {
  page?: number;
  pageSize?: number;
  active?: true;
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
  }),
});

export const { useListCitiesQuery } = citiesApi;
