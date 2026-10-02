import { baseApi } from '@/lib/baseApi';
import type { ApiOk } from '@/lib/types';

export interface RaffleDrawDTO {
  orderId: string;
  orderNumber: number;
  raffleNumber: number;
  customerName: string;
  customerPhone: string;
  /** Pedidos que participaban en este sorteo (antes de descartar el elegido). */
  eligibleCount: number;
}

export interface RaffleWinnerDTO {
  id: string;
  orderId: string;
  orderNumber: number;
  raffleNumber: number;
  customerName: string;
  customerPhone: string;
  confirmedByName: string | null;
  confirmedAt: string;
}

export interface RaffleSummaryDTO {
  /** Pedidos que hoy participarían: completados, con número de sorteo y que aún no ganaron. */
  eligibleCount: number;
  winners: RaffleWinnerDTO[];
}

export const raffleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRaffleSummary: builder.query<ApiOk<RaffleSummaryDTO>, void>({
      query: () => '/raffle',
      providesTags: [{ type: 'Raffle', id: 'SUMMARY' }],
    }),
    // Sortear solo elige un pedido al azar: no guarda nada, por eso no invalida caché.
    drawRaffle: builder.mutation<ApiOk<RaffleDrawDTO>, { excludeOrderIds: string[] }>({
      query: (body) => ({ url: '/raffle/draw', method: 'POST', body }),
    }),
    // Confirmar sí guarda al ganador: refresca el resumen (ganadores y participantes restantes).
    confirmRaffleWinner: builder.mutation<ApiOk<RaffleWinnerDTO>, { orderId: string }>({
      query: (body) => ({ url: '/raffle/winners', method: 'POST', body }),
      invalidatesTags: [{ type: 'Raffle', id: 'SUMMARY' }],
    }),
  }),
});

export const { useGetRaffleSummaryQuery, useDrawRaffleMutation, useConfirmRaffleWinnerMutation } =
  raffleApi;
