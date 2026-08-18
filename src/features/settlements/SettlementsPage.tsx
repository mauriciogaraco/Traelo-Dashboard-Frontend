import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useListDeliverersQuery } from '@/features/deliverers/deliverersApi';
import { SETTLEMENT_STATUS_LABEL, SETTLEMENT_TYPE_LABEL } from '@/lib/labels';
import type { SettlementStatus, SettlementType } from '@/lib/types';
import { GenerateSettlementModal } from './GenerateSettlementModal';
import { useListSettlementsQuery } from './settlementsApi';

const PAGE_SIZE = 10;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatPeriod(periodStart: string, periodEnd: string): string {
  const start = formatDate(periodStart);
  const end = formatDate(periodEnd);
  return start === end ? start : `${start} – ${end}`;
}

export function SettlementsPage() {
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.user);
  const isDeliverer = currentUser?.role === 'DELIVERER';
  const canGenerate =
    currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN' || currentUser?.role === 'EMPLOYEE';

  const [page, setPage] = useState(1);
  const [delivererId, setDelivererId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | SettlementType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | SettlementStatus>('all');
  const [generateOpen, setGenerateOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [delivererId, typeFilter, statusFilter]);

  const { data: deliverersData } = useListDeliverersQuery(
    { pageSize: 100, active: true },
    { skip: isDeliverer },
  );
  const delivererOptions = (deliverersData?.data ?? []).map((d) => ({ value: d.id, label: d.name }));

  const { data, isLoading, isFetching } = useListSettlementsQuery({
    page,
    pageSize: PAGE_SIZE,
    delivererId: isDeliverer ? undefined : delivererId ?? undefined,
    type: typeFilter === 'all' ? undefined : typeFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const rows = data?.data ?? [];
  const meta = data?.meta ?? null;
  const columnCount = isDeliverer ? 6 : 7;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Cuadres</h1>
        {canGenerate && (
          <Button type="button" onClick={() => setGenerateOpen(true)}>
            <Plus className="h-4 w-4" />
            Generar cuadre
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {!isDeliverer && (
          <div className="w-64">
            <SearchableSelect
              label="Mensajero"
              value={delivererId}
              onChange={setDelivererId}
              options={delivererOptions}
              placeholder="Todos"
            />
          </div>
        )}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | SettlementType)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="all">Todos los tipos</option>
          <option value="DAILY">Diario</option>
          <option value="WEEKLY">Semanal</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | SettlementStatus)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="all">Todos los estados</option>
          <option value="OPEN">Abiertos</option>
          <option value="CLOSED">Cerrados</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {!isDeliverer && <th className="px-4 py-3 font-medium">Mensajero</th>}
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Periodo</th>
              <th className="px-4 py-3 font-medium">Entregas</th>
              <th className="px-4 py-3 font-medium">Recaudado</th>
              <th className="px-4 py-3 font-medium">A entregar</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={columnCount} className="px-4 py-8 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="px-4 py-8 text-center text-slate-400">
                  No hay cuadres que coincidan con los filtros.
                </td>
              </tr>
            )}
            {rows.map((settlement) => (
              <tr
                key={settlement.id}
                className="cursor-pointer text-slate-700 hover:bg-slate-50"
                onClick={() => navigate(`/settlements/${settlement.id}`)}
              >
                {!isDeliverer && (
                  <td className="px-4 py-3 font-medium text-slate-900">{settlement.delivererName}</td>
                )}
                <td className="px-4 py-3">{SETTLEMENT_TYPE_LABEL[settlement.type]}</td>
                <td className="px-4 py-3">{formatPeriod(settlement.periodStart, settlement.periodEnd)}</td>
                <td className="px-4 py-3">{settlement.totalDeliveries}</td>
                <td className="px-4 py-3">{settlement.totalCollected} CUP</td>
                <td className="px-4 py-3 font-medium text-slate-900">{settlement.totalToDeliver} CUP</td>
                <td className="px-4 py-3">
                  <Badge tone={settlement.status === 'OPEN' ? 'amber' : 'green'}>
                    {SETTLEMENT_STATUS_LABEL[settlement.status]}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {meta && <Pagination meta={meta} onPageChange={setPage} />}
      </div>
      {isFetching && !isLoading && <p className="text-xs text-slate-400">Actualizando…</p>}

      {generateOpen && (
        <GenerateSettlementModal
          onClose={() => setGenerateOpen(false)}
          onGenerated={(id) => {
            setGenerateOpen(false);
            navigate(`/settlements/${id}`);
          }}
        />
      )}
    </div>
  );
}
