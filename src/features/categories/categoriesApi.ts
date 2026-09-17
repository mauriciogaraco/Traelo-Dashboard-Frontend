import { baseApi } from '@/lib/baseApi';
import type { ApiPaginated, CategoryDTO } from '@/lib/types';

export interface ListCategoriesParams {
  active?: true;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const categoriesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listCategories: builder.query<ApiPaginated<CategoryDTO>, ListCategoriesParams | void>({
      query: (params) => ({ url: '/categories', params: params ?? undefined }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((c) => ({ type: 'Category' as const, id: c.id })),
              { type: 'Category' as const, id: 'LIST' },
            ]
          : [{ type: 'Category' as const, id: 'LIST' }],
    }),
  }),
});

export const { useListCategoriesQuery } = categoriesApi;
