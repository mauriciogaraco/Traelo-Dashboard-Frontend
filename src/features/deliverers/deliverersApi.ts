import { baseApi } from '@/lib/baseApi';
import type { ApiOk, ApiPaginated, DateRangePreset, DelivererDTO, DelivererVehicle } from '@/lib/types';

export interface ListDeliverersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  // "active" solo admite el valor true: ver la misma nota en usersApi.ts.
  active?: true;
  // "Trabajando hoy": filtra por si está en línea en la cola de despacho (Deliverer.queuedAt).
  // A diferencia de `active`, este sí admite false de forma confiable (usa booleanQueryParam
  // en el backend).
  onDuty?: boolean;
  // Solo mensajeros que operan en esa ciudad (pisa la ciudad activa del topbar).
  cityId?: string;
}

export interface DelivererBonusDTO {
  delivererId: string;
  name: string;
  active: boolean;
  completedDeliveries: number;
  reviewCount: number;
  averageRating: number | null;
  points: number;
}

export interface DelivererBonusesDTO {
  range: { from: string; to: string };
  rows: DelivererBonusDTO[];
}

// Bono de mensajeros: % del servicio de la semana (lunes a domingo, hora de La Habana) por volumen,
// reseñas y fiabilidad. Ver deliverer-bonus-rules en el backend. También se consulta por día
// (lo que aportó ese día) o por mes (suma de las semanas que empiezan dentro del mes).
export type BonusPeriod = 'day' | 'week' | 'month';

export interface DelivererBonusWeekDTO {
  from: string;
  to: string;
  serviceTotal: number;
  bonusPct: number;
  bonusAmount: number;
}

export interface DelivererWeeklyBonusDTO {
  delivererId: string;
  name: string;
  active: boolean;
  serviceTotal: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  // completadas / (completadas + canceladas), de 0 a 1.
  completionRate: number;
  reviewCount: number;
  averageRating: number | null;
  // Componentes del bono (de la semana). null en el mes: ahí cada semana tiene los suyos.
  volumePct: number | null;
  actionsPct: number | null;
  reliabilityPct: number | null;
  // Semana: el % de bono. Día: el % de su semana. Mes: el % efectivo (bono ÷ servicio).
  bonusPct: number;
  // Semana: el bono. Día: lo que aportó ese día. Mes: suma de los bonos de sus semanas.
  bonusAmount: number;
  // Clasificó al bono: gana algo en el período.
  qualified: boolean;
  // Solo en el mes.
  weeks?: DelivererBonusWeekDTO[];
}

export interface DelivererWeeklyBonusesDTO {
  period: BonusPeriod;
  week: { from: string; to: string };
  weeks: { from: string; to: string }[];
  rows: DelivererWeeklyBonusDTO[];
  totals: { serviceTotal: number; bonusAmount: number };
}

export interface DelivererWeeklyBonusesParams {
  period?: BonusPeriod;
  // Cualquier fecha dentro del período (ISO); sin ella, el período en curso.
  date?: string;
}

export interface DelivererBonusesParams {
  range?: Exclude<DateRangePreset, 'custom'>;
}

export interface CreateDelivererInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  joinedAt?: string;
  commissionPercentage?: number;
  vehicle?: DelivererVehicle;
  cityIds?: string[];
}

export interface UpdateDelivererInput {
  name?: string;
  phone?: string;
  active?: boolean;
  commissionPercentage?: number | null;
  vehicle?: DelivererVehicle;
  cityIds?: string[];
}

export interface DispatchQueueEntryDTO {
  id: string;
  name: string;
  queuedAt: string;
  busy: boolean;
  position: number;
}

// Veto de un mensajero a un negocio (solo OWNER/ADMIN): no recibe pedidos de ese local por el
// despacho automático y conserva su turno en la cola.
export interface DelivererBusinessBanDTO {
  businessId: string;
  businessName: string;
  reason: string | null;
  createdAt: string;
}

export const deliverersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listDeliverers: builder.query<ApiPaginated<DelivererDTO>, ListDeliverersParams | void>({
      query: (params) => ({ url: '/deliverers', params: params ?? undefined }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((d) => ({ type: 'Deliverer' as const, id: d.id })),
              { type: 'Deliverer' as const, id: 'LIST' },
            ]
          : [{ type: 'Deliverer' as const, id: 'LIST' }],
    }),
    getDelivererBonuses: builder.query<ApiOk<DelivererBonusesDTO>, DelivererBonusesParams | void>({
      query: (params) => ({ url: '/deliverers/bonuses', params: params ?? undefined }),
    }),
    getDelivererWeeklyBonuses: builder.query<
      ApiOk<DelivererWeeklyBonusesDTO>,
      DelivererWeeklyBonusesParams | void
    >({
      query: (params) => ({ url: '/deliverers/bonuses/weekly', params: params ?? undefined }),
    }),
    // Orden real de la cola (botón "Ver orden real" en Trabajando hoy) — se pide al toque, no se
    // deja en caché: la posición cambia apenas se asigna un pedido.
    getDispatchQueue: builder.query<ApiOk<DispatchQueueEntryDTO[]>, void>({
      query: () => ({ url: '/deliverers/queue' }),
    }),
    createDeliverer: builder.mutation<ApiOk<DelivererDTO>, CreateDelivererInput>({
      query: (body) => ({ url: '/deliverers', method: 'POST', body }),
      invalidatesTags: [{ type: 'Deliverer', id: 'LIST' }],
    }),
    updateDeliverer: builder.mutation<
      ApiOk<DelivererDTO>,
      { id: string; body: UpdateDelivererInput }
    >({
      query: ({ id, body }) => ({ url: `/deliverers/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Deliverer', id },
        { type: 'Deliverer', id: 'LIST' },
      ],
    }),
    // Activa/desactiva a un mensajero en la cola de hoy ("Trabajando hoy"); no es la cuenta.
    setDelivererDuty: builder.mutation<ApiOk<DelivererDTO>, { id: string; onDuty: boolean }>({
      query: ({ id, onDuty }) => ({ url: `/deliverers/${id}/duty`, method: 'PATCH', body: { onDuty } }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Deliverer', id },
        { type: 'Deliverer', id: 'LIST' },
      ],
    }),
    listDelivererBans: builder.query<ApiOk<DelivererBusinessBanDTO[]>, string>({
      query: (id) => `/deliverers/${id}/banned-businesses`,
      providesTags: (_result, _error, id) => [{ type: 'Deliverer' as const, id: `BANS-${id}` }],
    }),
    banDelivererFromBusiness: builder.mutation<
      ApiOk<DelivererBusinessBanDTO>,
      { id: string; businessId: string; reason?: string }
    >({
      query: ({ id, businessId, reason }) => ({
        url: `/deliverers/${id}/banned-businesses/${businessId}`,
        method: 'PUT',
        body: reason ? { reason } : {},
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Deliverer', id: `BANS-${id}` }],
    }),
    unbanDelivererFromBusiness: builder.mutation<void, { id: string; businessId: string }>({
      query: ({ id, businessId }) => ({
        url: `/deliverers/${id}/banned-businesses/${businessId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Deliverer', id: `BANS-${id}` }],
    }),
    deactivateDeliverer: builder.mutation<ApiOk<DelivererDTO>, string>({
      query: (id) => ({ url: `/deliverers/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Deliverer', id },
        { type: 'Deliverer', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListDeliverersQuery,
  useGetDelivererBonusesQuery,
  useGetDelivererWeeklyBonusesQuery,
  useLazyGetDispatchQueueQuery,
  useCreateDelivererMutation,
  useUpdateDelivererMutation,
  useSetDelivererDutyMutation,
  useDeactivateDelivererMutation,
  useListDelivererBansQuery,
  useBanDelivererFromBusinessMutation,
  useUnbanDelivererFromBusinessMutation,
} = deliverersApi;
