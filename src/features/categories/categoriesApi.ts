import { baseApi } from '@/lib/baseApi';
import type { ApiOk, ApiPaginated, CategoryDTO } from '@/lib/types';

export interface ListCategoriesParams {
  active?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateCategoryInput {
  name: string;
  slug: string;
  icon?: string;
  sortOrder?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  icon?: string;
  sortOrder?: number;
  active?: boolean;
}

function buildImageFormData(file: File): FormData {
  const formData = new FormData();
  formData.append('image', file);
  return formData;
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
    createCategory: builder.mutation<ApiOk<CategoryDTO>, CreateCategoryInput>({
      query: (body) => ({ url: '/categories', method: 'POST', body }),
      invalidatesTags: [{ type: 'Category', id: 'LIST' }],
    }),
    updateCategory: builder.mutation<ApiOk<CategoryDTO>, { id: string; body: UpdateCategoryInput }>({
      query: ({ id, body }) => ({ url: `/categories/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Category', id },
        { type: 'Category', id: 'LIST' },
      ],
    }),
    // El DELETE del backend es una baja lógica (active = false).
    deactivateCategory: builder.mutation<ApiOk<CategoryDTO>, string>({
      query: (id) => ({ url: `/categories/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Category', id },
        { type: 'Category', id: 'LIST' },
      ],
    }),
    uploadCategoryImage: builder.mutation<ApiOk<CategoryDTO>, { id: string; file: File }>({
      query: ({ id, file }) => ({
        url: `/categories/${id}/image`,
        method: 'POST',
        body: buildImageFormData(file),
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Category', id },
        { type: 'Category', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeactivateCategoryMutation,
  useUploadCategoryImageMutation,
} = categoriesApi;
