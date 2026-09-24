import { baseApi } from '@/lib/baseApi';
import type { AdminProductDTO, ApiPaginated } from '@/lib/types';

export interface ListAllProductsParams {
  search?: string;
  categoryId?: string;
  businessId?: string;
  featured?: boolean;
  active?: boolean;
  page?: number;
  pageSize?: number;
}

export const productsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Módulo "Productos" (dashboard, OWNER/ADMIN): lista entre TODOS los negocios. El toggle de
    // destacado se hace con useUpdateProductMutation de businessesApi (mismo PATCH por negocio) —
    // sus invalidatesTags por id de producto ya refrescan esta lista, no hace falta duplicar nada.
    listAllProducts: builder.query<ApiPaginated<AdminProductDTO>, ListAllProductsParams | void>({
      query: (params) => ({ url: '/products', params: params ?? undefined }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((p) => ({ type: 'Product' as const, id: p.id })),
              { type: 'Product' as const, id: 'ADMIN_LIST' },
            ]
          : [{ type: 'Product' as const, id: 'ADMIN_LIST' }],
    }),
  }),
});

export const { useListAllProductsQuery } = productsApi;
