import { baseApi } from '@/lib/baseApi';
import type { ApiOk, ApiPaginated, ProductProposalDTO, ProposalStatus, ProposalType } from '@/lib/types';

export interface ListProposalsParams {
  businessId?: string;
  status?: ProposalStatus;
  type?: ProposalType;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export const productProposalsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Cola de revisión comercial (COMMERCIAL/ADMIN/OWNER) — cruza negocios.
    listProductProposals: builder.query<ApiPaginated<ProductProposalDTO>, ListProposalsParams | void>({
      query: (params) => ({ url: '/product-proposals', params: params ?? undefined }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((p) => ({ type: 'ProductProposal' as const, id: p.id })),
              { type: 'ProductProposal' as const, id: 'LIST' },
            ]
          : [{ type: 'ProductProposal' as const, id: 'LIST' }],
    }),
    getProductProposal: builder.query<ApiOk<ProductProposalDTO>, string>({
      query: (proposalId) => ({ url: `/product-proposals/${proposalId}` }),
      providesTags: (_result, _error, proposalId) => [
        { type: 'ProductProposal', id: proposalId },
      ],
    }),
    approveProductProposal: builder.mutation<ApiOk<ProductProposalDTO>, string>({
      query: (proposalId) => ({
        url: `/product-proposals/${proposalId}/approve`,
        method: 'POST',
      }),
      // Aprobar crea o edita un Product de verdad: hay que refrescar tanto el catálogo del
      // negocio (ProductsTab) como el listado global "Productos" del dashboard.
      invalidatesTags: (result, _error, proposalId) => [
        { type: 'ProductProposal', id: proposalId },
        { type: 'ProductProposal', id: 'LIST' },
        ...(result ? [{ type: 'Product' as const, id: `LIST-${result.data.businessId}` }] : []),
        { type: 'Product', id: 'ADMIN_LIST' },
      ],
    }),
    rejectProductProposal: builder.mutation<
      ApiOk<ProductProposalDTO>,
      { proposalId: string; reason: string }
    >({
      query: ({ proposalId, reason }) => ({
        url: `/product-proposals/${proposalId}/reject`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { proposalId }) => [
        { type: 'ProductProposal', id: proposalId },
        { type: 'ProductProposal', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListProductProposalsQuery,
  useGetProductProposalQuery,
  useApproveProductProposalMutation,
  useRejectProductProposalMutation,
} = productProposalsApi;
