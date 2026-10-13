import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { formatDateTime } from '@/lib/formatDate';
import type { ProductProposalDTO, ProposalStatus, ProposalType } from '@/lib/types';
import { useListBusinessesQuery } from '@/features/businesses/businessesApi';
import { ProductProposalReviewModal } from './ProductProposalReviewModal';
import { useListProductProposalsQuery } from './productProposalsApi';

const PAGE_SIZE = 20;

const STATUS_BADGE: Record<ProposalStatus, { tone: 'amber' | 'green' | 'red' | 'slate'; label: string }> = {
  PENDING: { tone: 'amber', label: 'Pendiente' },
  APPROVED: { tone: 'green', label: 'Aprobada' },
  REJECTED: { tone: 'red', label: 'Rechazada' },
  CANCELLED: { tone: 'slate', label: 'Cancelada' },
};

function formatPrice(value: number | null | undefined): string {
  return value !== null && value !== undefined ? `${value} CUP` : '—';
}

export function ProductProposalsPage() {
  const [page, setPage] = useState(1);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [status, setStatus] = useState<ProposalStatus | 'all'>('PENDING');
  const [type, setType] = useState<ProposalType | 'all'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<ProductProposalDTO | null>(null);

  useEffect(() => {
    setPage(1);
  }, [businessId, status, type, from, to]);

  // paginationQuerySchema del backend limita pageSize a 100 (ver shared/http/pagination.ts) —
  // 200 siempre devuelve 400, sin importar cuántos negocios existan realmente (mismo bug
  // preexistente que ProductsPage.tsx y AbandonedCartsPage.tsx de este mismo dashboard).
  const { data: businessesData } = useListBusinessesQuery({ pageSize: 100, active: true });
  const businessOptions = useMemo(
    () => (businessesData?.data ?? []).map((b) => ({ value: b.id, label: b.name })),
    [businessesData],
  );

  const { data, isLoading } = useListProductProposalsQuery({
    businessId: businessId ?? undefined,
    status: status === 'all' ? undefined : status,
    type: type === 'all' ? undefined : type,
    from: from || undefined,
    to: to || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  // Contador global de pendientes: independiente de los filtros de arriba, para que el número
  // en el título siempre refleje lo que realmente hay por revisar.
  const { data: pendingCountData } = useListProductProposalsQuery({ status: 'PENDING', pageSize: 1 });
  const pendingCount = pendingCountData?.meta.total ?? 0;

  const rows = data?.data ?? [];
  const openProposal = selectedProposal
    ? rows.find((p) => p.id === selectedProposal.id) ?? selectedProposal
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Propuestas de productos
          {pendingCount > 0 && (
            <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-medium text-amber-700">
              {pendingCount} pendiente{pendingCount === 1 ? '' : 's'}
            </span>
          )}
        </h1>
        <p className="text-sm text-slate-500">
          Altas y ediciones de catálogo propuestas por dueños de negocio, pendientes de
          aprobación antes de publicarse.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <SearchableSelect
            label="Negocio"
            value={businessId}
            onChange={setBusinessId}
            options={businessOptions}
            placeholder="Todos los negocios"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700" htmlFor="proposal-status">
            Estado
          </label>
          <select
            id="proposal-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProposalStatus | 'all')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">Todos</option>
            <option value="PENDING">Pendientes</option>
            <option value="APPROVED">Aprobadas</option>
            <option value="REJECTED">Rechazadas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700" htmlFor="proposal-type">
            Tipo
          </label>
          <select
            id="proposal-type"
            value={type}
            onChange={(e) => setType(e.target.value as ProposalType | 'all')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">Todos</option>
            <option value="CREATE">Alta</option>
            <option value="EDIT">Edición</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700" htmlFor="proposal-from">
            Desde
          </label>
          <input
            id="proposal-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700" htmlFor="proposal-to">
            Hasta
          </label>
          <input
            id="proposal-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Negocio</th>
              <th className="px-4 py-3 font-medium">Propuesto por</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Precio actual → propuesto</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No hay propuestas que coincidan con estos filtros.
                </td>
              </tr>
            )}
            {rows.map((proposal) => {
              const badge = STATUS_BADGE[proposal.status];
              const name = proposal.currentProduct?.name ?? proposal.proposedData.name ?? '—';
              return (
                <tr
                  key={proposal.id}
                  onClick={() => setSelectedProposal(proposal)}
                  className="cursor-pointer text-slate-700 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <div className="flex items-center gap-3">
                      <Thumbnail src={proposal.proposedData.imageUrl ?? proposal.currentProduct?.imageUrl} alt={name} size={36} />
                      <span>{name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{proposal.businessName}</td>
                  <td className="px-4 py-3">{proposal.createdByName}</td>
                  <td className="px-4 py-3">
                    <Badge tone={proposal.type === 'CREATE' ? 'brand' : 'slate'}>
                      {proposal.type === 'CREATE' ? 'Alta' : 'Edición'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {proposal.type === 'EDIT'
                      ? `${formatPrice(proposal.currentProduct?.price)} → ${formatPrice(
                          proposal.proposedData.price ?? proposal.currentProduct?.price,
                        )}`
                      : formatPrice(proposal.proposedData.price)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </td>
                  <td className="px-4 py-3">{formatDateTime(proposal.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </div>

      {openProposal && (
        <ProductProposalReviewModal proposal={openProposal} onClose={() => setSelectedProposal(null)} />
      )}
    </div>
  );
}
