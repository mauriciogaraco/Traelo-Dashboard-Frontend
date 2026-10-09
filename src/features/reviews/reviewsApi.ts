import { baseApi } from '@/lib/baseApi';
import type { ApiPaginated } from '@/lib/types';

export type ReviewTypeFilter = 'ALL' | 'DELIVERER' | 'BUSINESS';
export type ReviewRangePreset = 'today' | 'week' | 'month' | '6months' | 'year';

export interface ListReviewsParams {
  page?: number;
  pageSize?: number;
  type?: ReviewTypeFilter;
  delivererId?: string;
  businessId?: string;
  /** Desde esta calificación (inclusive). */
  ratingMin?: number;
  /** Solo por debajo de esta calificación (exclusivo). */
  ratingBelow?: number;
  range?: ReviewRangePreset;
}

export interface ReviewListItemDTO {
  id: string;
  type: 'DELIVERER' | 'BUSINESS';
  /** 1.0 a 5.0. */
  rating: number;
  createdAt: string;
  orderId: string;
  orderNumber: number;
  /** Quién calificó: la cuenta del cliente, o los datos del pedido si fue un invitado. */
  customer: { id: string | null; name: string; phone: string; isGuest: boolean };
  /** A quién se calificó (solo uno de los dos viene con datos). */
  deliverer: { id: string; name: string } | null;
  business: { id: string; name: string } | null;
}

export interface ReviewsResponse extends ApiPaginated<ReviewListItemDTO> {
  /** De todas las reseñas que cumplen los filtros, no solo de la página. */
  summary: { count: number; average: number | null };
}

export const reviewsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listReviews: builder.query<ReviewsResponse, ListReviewsParams | void>({
      query: (params) => ({ url: '/reviews', params: params ?? undefined }),
    }),
  }),
});

export const { useListReviewsQuery } = reviewsApi;
