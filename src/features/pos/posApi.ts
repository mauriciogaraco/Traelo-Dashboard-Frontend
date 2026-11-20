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

// Un «usuario» del negocio en el servidor es un dispositivo con rol firmado: administrador (dueño) o caja.
export interface PosDeviceDTO {
  deviceId: string;
  name: string;
  role: 'admin' | 'cashier';
  status: 'active' | 'revoked';
  registeredAt: string;
  lastSeenAt: string | null;
  license: {
    status: 'active' | 'superseded' | 'revoked';
    issuedAt: string;
    expiresAt: string;
    graceUntil: string;
  } | null;
}

export interface PosBusinessDevicesDTO {
  business: PosBusinessDTO;
  seats: { role: 'admin' | 'cashier'; allowed: number | null; used: number }[];
  devices: PosDeviceDTO[];
}

// Módulos de la app POS con su interruptor para el dispositivo de CAJA (el administrador siempre tiene todos).
export interface CashierPermissionsDTO {
  /** `null` mientras nadie ha configurado nada: la caja usa los módulos por defecto. */
  version: number | null;
  isDefault: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  modules: {
    key: string;
    label: string;
    description: string;
    cashierDefault: boolean;
    enabled: boolean;
  }[];
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
    getPosBusinessDevices: builder.query<ApiOk<PosBusinessDevicesDTO>, string>({
      query: (id) => `/pos/admin/businesses/${id}/devices`,
      providesTags: (_result, _error, id) => [{ type: 'PosBusiness', id }],
    }),
    // Libera el asiento de un dispositivo. `transfer` es lo mismo, anotado como transferencia en el historial.
    revokePosDevice: builder.mutation<
      ApiOk<PosBusinessDevicesDTO>,
      { businessId: string; deviceId: string; reason: 'revoked' | 'transfer' }
    >({
      query: ({ businessId, deviceId, reason }) => ({
        url: `/pos/admin/businesses/${businessId}/devices/${encodeURIComponent(deviceId)}/revoke`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { businessId }) => [
        { type: 'PosBusiness', id: businessId },
        { type: 'PosBusiness', id: 'LIST' },
      ],
    }),
    getCashierPermissions: builder.query<ApiOk<CashierPermissionsDTO>, string>({
      query: (id) => `/pos/admin/businesses/${id}/cashier-permissions`,
      providesTags: (_result, _error, id) => [{ type: 'PosBusiness', id: `${id}:permissions` }],
    }),
    setCashierPermissions: builder.mutation<
      ApiOk<CashierPermissionsDTO>,
      { businessId: string; modules: string[] }
    >({
      query: ({ businessId, modules }) => ({
        url: `/pos/admin/businesses/${businessId}/cashier-permissions`,
        method: 'PUT',
        body: { modules },
      }),
      invalidatesTags: (_result, _error, { businessId }) => [
        { type: 'PosBusiness', id: `${businessId}:permissions` },
      ],
    }),
    createPosBusiness: builder.mutation<ApiOk<PosBusinessDTO>, CreatePosBusinessInput>({
      query: (body) => ({ url: '/pos/admin/businesses', method: 'POST', body }),
      invalidatesTags: [{ type: 'PosBusiness', id: 'LIST' }],
    }),
  }),
});

export const {
  useListPosBusinessesQuery,
  useGetPosBusinessDevicesQuery,
  useRevokePosDeviceMutation,
  useGetCashierPermissionsQuery,
  useSetCashierPermissionsMutation,
  useCreatePosBusinessMutation,
} = posApi;
