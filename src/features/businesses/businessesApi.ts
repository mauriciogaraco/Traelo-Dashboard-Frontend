import { baseApi } from '@/lib/baseApi';
import type {
  ApiOk,
  ApiPaginated,
  BusinessClosureDTO,
  BusinessDetailDTO,
  BusinessDTO,
  BusinessHoursDTO,
  BusinessSubscriptionDTO,
  CommissionType,
  PackagingOption,
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
  deliveryFeeBase?: number;
}

export interface UpdateBusinessInput {
  name?: string;
  phone?: string;
  address?: string;
  active?: boolean;
  acceptingOrders?: boolean;
  commissionType?: CommissionType;
  commissionPercentage?: number;
  defaultProductCommissionAmount?: number;
  deliveryFeeBase?: number;
}

export interface ListProductsParams {
  businessId: string;
  page?: number;
  pageSize?: number;
  category?: string;
  active?: true;
  /** Búsqueda por nombre (contiene, sin distinguir mayúsculas). */
  search?: string;
}

export interface CreateProductInput {
  businessId: string;
  name: string;
  description?: string;
  category?: string;
  categoryId?: string;
  price?: number;
  externalId?: string;
  packaging?: PackagingOption[];
}

export interface UpdateProductInput {
  name?: string;
  description?: string | null;
  category?: string;
  categoryId?: string | null;
  price?: number;
  active?: boolean;
  /** null o [] quitan el empaque; omitido no lo toca. */
  packaging?: PackagingOption[] | null;
}

export interface SetProductAvailabilityInput {
  businessId: string;
  productId: string;
  available?: boolean;
  lowStock?: boolean;
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

export interface UpsertBusinessHoursInput {
  businessId: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  closed?: boolean;
}

export interface CreateBusinessClosureInput {
  businessId: string;
  date: string;
  reason?: string;
}

function buildImageFormData(file: File): FormData {
  const formData = new FormData();
  formData.append('image', file);
  return formData;
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
    setAcceptingOrders: builder.mutation<
      ApiOk<BusinessDTO>,
      { id: string; acceptingOrders: boolean }
    >({
      query: ({ id, acceptingOrders }) => ({
        url: `/businesses/${id}/accepting-orders`,
        method: 'PATCH',
        body: { acceptingOrders },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Business', id },
        { type: 'Business', id: 'LIST' },
      ],
    }),
    uploadBusinessLogo: builder.mutation<ApiOk<BusinessDTO>, { id: string; file: File }>({
      query: ({ id, file }) => ({
        url: `/businesses/${id}/logo`,
        method: 'POST',
        body: buildImageFormData(file),
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Business', id },
        { type: 'Business', id: 'LIST' },
      ],
    }),

    // ── Horario semanal ───────────────────────────────────
    listBusinessHours: builder.query<ApiOk<BusinessHoursDTO[]>, string>({
      query: (businessId) => `/businesses/${businessId}/hours`,
      providesTags: (_result, _error, businessId) => [{ type: 'BusinessHours', id: businessId }],
    }),
    upsertBusinessHours: builder.mutation<ApiOk<BusinessHoursDTO>, UpsertBusinessHoursInput>({
      query: ({ businessId, dayOfWeek, ...body }) => ({
        url: `/businesses/${businessId}/hours/${dayOfWeek}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { businessId }) => [
        { type: 'BusinessHours', id: businessId },
      ],
    }),

    // ── Cierres excepcionales ─────────────────────────────
    listBusinessClosures: builder.query<
      ApiOk<BusinessClosureDTO[]>,
      { businessId: string; upcoming?: boolean }
    >({
      query: ({ businessId, upcoming }) => ({
        url: `/businesses/${businessId}/closures`,
        params: upcoming ? { upcoming } : undefined,
      }),
      providesTags: (_result, _error, { businessId }) => [
        { type: 'BusinessClosure', id: businessId },
      ],
    }),
    createBusinessClosure: builder.mutation<ApiOk<BusinessClosureDTO>, CreateBusinessClosureInput>({
      query: ({ businessId, ...body }) => ({
        url: `/businesses/${businessId}/closures`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { businessId }) => [
        { type: 'BusinessClosure', id: businessId },
      ],
    }),
    deleteBusinessClosure: builder.mutation<void, { businessId: string; closureId: string }>({
      query: ({ businessId, closureId }) => ({
        url: `/businesses/${businessId}/closures/${closureId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { businessId }) => [
        { type: 'BusinessClosure', id: businessId },
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
    setProductAvailability: builder.mutation<ApiOk<ProductDTO>, SetProductAvailabilityInput>({
      query: ({ businessId, productId, ...body }) => ({
        url: `/businesses/${businessId}/products/${productId}/availability`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { businessId, productId }) => [
        { type: 'Product', id: productId },
        { type: 'Product', id: `LIST-${businessId}` },
      ],
    }),
    uploadProductImage: builder.mutation<
      ApiOk<ProductDTO>,
      { businessId: string; productId: string; file: File }
    >({
      query: ({ businessId, productId, file }) => ({
        url: `/businesses/${businessId}/products/${productId}/image`,
        method: 'POST',
        body: buildImageFormData(file),
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
  useSetAcceptingOrdersMutation,
  useUploadBusinessLogoMutation,
  useListBusinessHoursQuery,
  useUpsertBusinessHoursMutation,
  useListBusinessClosuresQuery,
  useCreateBusinessClosureMutation,
  useDeleteBusinessClosureMutation,
  useListProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeactivateProductMutation,
  useSetProductAvailabilityMutation,
  useUploadProductImageMutation,
  useSetProductCommissionMutation,
  useRemoveProductCommissionMutation,
  useListSubscriptionsQuery,
  useCreateSubscriptionMutation,
  useUpdateSubscriptionMutation,
} = businessesApi;
