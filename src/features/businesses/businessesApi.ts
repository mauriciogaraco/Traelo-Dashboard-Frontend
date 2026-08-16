import { baseApi } from '@/lib/baseApi';
import type {
  ApiOk,
  ApiPaginated,
  BusinessDetailDTO,
  BusinessDTO,
  BusinessSubscriptionDTO,
  CommissionType,
  ProductDTO,
  SubscriptionCycle,
} from '@/lib/types';

export interface ListBusinessesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  commissionType?: CommissionType;
  // "active" solo admite el valor true: ver la nota en usersApi.ts.
  active?: true;
}

export interface CreateBusinessInput {
  name: string;
  phone: string;
  address: string;
  joinedAt?: string;
  commissionType: CommissionType;
  commissionPercentage?: number;
  defaultProductCommissionAmount?: number;
}

export interface UpdateBusinessInput {
  name?: string;
  phone?: string;
  address?: string;
  active?: boolean;
  commissionType?: CommissionType;
  commissionPercentage?: number;
  defaultProductCommissionAmount?: number;
}

export interface ListProductsParams {
  businessId: string;
  page?: number;
  pageSize?: number;
  category?: string;
  active?: true;
}

export interface CreateProductInput {
  businessId: string;
  name: string;
  category?: string;
  price?: number;
  externalId?: string;
}

export interface UpdateProductInput {
  name?: string;
  category?: string;
  price?: number;
  active?: boolean;
}

export interface ListSubscriptionsParams {
  businessId: string;
  page?: number;
  pageSize?: number;
}

export interface CreateSubscriptionInput {
  businessId: string;
  cycle: SubscriptionCycle;
  price: number;
  startDate?: string;
  endDate?: string;
}

export const businessesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── Negocios ──────────────────────────────────────────
    listBusinesses: builder.query<ApiPaginated<BusinessDTO>, ListBusinessesParams | void>({
      query: (params) => ({ url: '/businesses', params: params ?? undefined }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((b) => ({ type: 'Business' as const, id: b.id })),
              { type: 'Business' as const, id: 'LIST' },
            ]
          : [{ type: 'Business' as const, id: 'LIST' }],
    }),
    getBusiness: builder.query<ApiOk<BusinessDetailDTO>, string>({
      query: (id) => `/businesses/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Business', id }],
    }),
    createBusiness: builder.mutation<ApiOk<BusinessDTO>, CreateBusinessInput>({
      query: (body) => ({ url: '/businesses', method: 'POST', body }),
      invalidatesTags: [{ type: 'Business', id: 'LIST' }],
    }),
    updateBusiness: builder.mutation<
      ApiOk<BusinessDTO>,
      { id: string; body: UpdateBusinessInput }
    >({
      query: ({ id, body }) => ({ url: `/businesses/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Business', id },
        { type: 'Business', id: 'LIST' },
      ],
    }),
    deactivateBusiness: builder.mutation<ApiOk<BusinessDTO>, string>({
      query: (id) => ({ url: `/businesses/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Business', id },
        { type: 'Business', id: 'LIST' },
      ],
    }),

    // ── Productos ─────────────────────────────────────────
    listProducts: builder.query<ApiPaginated<ProductDTO>, ListProductsParams>({
      query: ({ businessId, ...params }) => ({
        url: `/businesses/${businessId}/products`,
        params,
      }),
      providesTags: (result, _error, { businessId }) =>
        result
          ? [
              ...result.data.map((p) => ({ type: 'Product' as const, id: p.id })),
              { type: 'Product' as const, id: `LIST-${businessId}` },
            ]
          : [{ type: 'Product' as const, id: `LIST-${businessId}` }],
    }),
    createProduct: builder.mutation<ApiOk<ProductDTO>, CreateProductInput>({
      query: ({ businessId, ...body }) => ({
        url: `/businesses/${businessId}/products`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { businessId }) => [
        { type: 'Product', id: `LIST-${businessId}` },
      ],
    }),
    updateProduct: builder.mutation<
      ApiOk<ProductDTO>,
      { businessId: string; productId: string; body: UpdateProductInput }
    >({
      query: ({ businessId, productId, body }) => ({
        url: `/businesses/${businessId}/products/${productId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { businessId, productId }) => [
        { type: 'Product', id: productId },
        { type: 'Product', id: `LIST-${businessId}` },
      ],
    }),
    deactivateProduct: builder.mutation<
      ApiOk<ProductDTO>,
      { businessId: string; productId: string }
    >({
      query: ({ businessId, productId }) => ({
        url: `/businesses/${businessId}/products/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { businessId, productId }) => [
        { type: 'Product', id: productId },
        { type: 'Product', id: `LIST-${businessId}` },
      ],
    }),
    setProductCommission: builder.mutation<
      ApiOk<{ commissionAmount: number }>,
      { businessId: string; productId: string; commissionAmount: number }
    >({
      query: ({ businessId, productId, commissionAmount }) => ({
        url: `/businesses/${businessId}/products/${productId}/commission`,
        method: 'PUT',
        body: { commissionAmount },
      }),
      invalidatesTags: (_result, _error, { businessId, productId }) => [
        { type: 'Product', id: productId },
        { type: 'Product', id: `LIST-${businessId}` },
      ],
    }),
    removeProductCommission: builder.mutation<
      void,
      { businessId: string; productId: string }
    >({
      query: ({ businessId, productId }) => ({
        url: `/businesses/${businessId}/products/${productId}/commission`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { businessId, productId }) => [
        { type: 'Product', id: productId },
        { type: 'Product', id: `LIST-${businessId}` },
      ],
    }),

    // ── Suscripciones ─────────────────────────────────────
    listSubscriptions: builder.query<ApiPaginated<BusinessSubscriptionDTO>, ListSubscriptionsParams>({
      query: ({ businessId, ...params }) => ({
        url: `/businesses/${businessId}/subscriptions`,
        params,
      }),
      providesTags: (result, _error, { businessId }) =>
        result
          ? [
              ...result.data.map((s) => ({ type: 'Subscription' as const, id: s.id })),
              { type: 'Subscription' as const, id: `LIST-${businessId}` },
            ]
          : [{ type: 'Subscription' as const, id: `LIST-${businessId}` }],
    }),
    createSubscription: builder.mutation<ApiOk<BusinessSubscriptionDTO>, CreateSubscriptionInput>({
      query: ({ businessId, ...body }) => ({
        url: `/businesses/${businessId}/subscriptions`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { businessId }) => [
        { type: 'Subscription', id: `LIST-${businessId}` },
        { type: 'Business', id: businessId },
      ],
    }),
    updateSubscription: builder.mutation<
      ApiOk<BusinessSubscriptionDTO>,
      { businessId: string; subId: string; body: { status?: 'CANCELLED'; endDate?: string } }
    >({
      query: ({ businessId, subId, body }) => ({
        url: `/businesses/${businessId}/subscriptions/${subId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { businessId, subId }) => [
        { type: 'Subscription', id: subId },
        { type: 'Subscription', id: `LIST-${businessId}` },
        { type: 'Business', id: businessId },
      ],
    }),
  }),
});

export const {
  useListBusinessesQuery,
  useGetBusinessQuery,
  useCreateBusinessMutation,
  useUpdateBusinessMutation,
  useDeactivateBusinessMutation,
  useListProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeactivateProductMutation,
  useSetProductCommissionMutation,
  useRemoveProductCommissionMutation,
  useListSubscriptionsQuery,
  useCreateSubscriptionMutation,
  useUpdateSubscriptionMutation,
} = businessesApi;
