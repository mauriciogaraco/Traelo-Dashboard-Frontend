import { baseApi } from '@/lib/baseApi';
import type {
  ApiOk,
  ApiPaginated,
  DateRangePreset,
  OrderStatus,
  OwnerBusinessDTO,
  OwnerSummaryDTO,
  PortalCustomerSortBy,
  PortalOrderDTO,
  RecurringCustomerDTO,
} from '@/lib/types';

export type PortalRange = Exclude<DateRangePreset, 'custom'>;

export interface PortalOrdersParams {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  range?: PortalRange;
  search?: string;
}

export interface PortalCustomersParams {
  range?: PortalRange;
  sortBy?: PortalCustomerSortBy;
  limit?: number;
}

// Endpoints exclusivos del rol BUSINESS_OWNER: el negocio lo resuelve el backend desde la
// sesión, por eso ninguna de estas rutas recibe un businessId.
export const portalApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyBusiness: builder.query<ApiOk<OwnerBusinessDTO>, void>({
      query: () => '/my-business',
      // Las mutaciones del catálogo invalidan {Business, id-real}; se provee ese mismo tag para
      // que logo/"acepta pedidos" refresquen esta vista sin código extra.
      providesTags: (result) => (result ? [{ type: 'Business', id: result.data.id }] : []),
    }),
    getPortalSummary: builder.query<ApiOk<OwnerSummaryDTO>, { range: PortalRange }>({
      query: (params) => ({ url: '/my-business/summary', params }),
    }),
    listPortalOrders: builder.query<ApiPaginated<PortalOrderDTO>, PortalOrdersParams | void>({
      query: (params) => ({ url: '/my-business/orders', params: params ?? undefined }),
    }),
    getPortalCustomers: builder.query<ApiOk<RecurringCustomerDTO[]>, PortalCustomersParams | void>({
      query: (params) => ({ url: '/my-business/customers', params: params ?? undefined }),
    }),
  }),
});

export const {
  useGetMyBusinessQuery,
  useGetPortalSummaryQuery,
  useListPortalOrdersQuery,
  useGetPortalCustomersQuery,
} = portalApi;
