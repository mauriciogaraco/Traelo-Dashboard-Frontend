import { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useAppSelector } from '@/app/hooks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useListDeliverersQuery } from '@/features/deliverers/deliverersApi';
import { ORDER_STATUS_LABEL } from '@/lib/labels';
import { OrderStatus } from '@/lib/types';
import type { DateRangePreset } from './ordersApi';
import { useListOrdersQuery } from './ordersApi';

const PAGE_SIZE = 15;

const STATUS_TONE: Record<OrderStatus, 'amber' | 'brand' | 'green' | 'slate'> = {
  PENDING: 'amber',
  ASSIGNED: 'brand',
  COMPLETED: 'green',
  CANCELLED: 'slate',
};

type RangeTab = DateRangePreset | 'all';

const RANGE_TABS: { value: RangeTab; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: '6months', label: 'Semestre' },
  { value: 'year', label: 'Año' },
  { value: 'all', label: 'Todos' },
];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OrdersPage() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const canManage = currentUser?.role !== 'DELIVERER';

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [delivererFilter, setDelivererFilter] = useState<string | null>(null);
  // Por defecto "Hoy" para no ver pedidos viejos mientras se cargan los del día.
  const [rangeTab, setRangeTab] = useState<RangeTab>('today');

  useEffect(() => {
    setPage(1);
  }, [statusFilter, delivererFilter, rangeTab]);

  const { data: deliverersData } = useListDeliverersQuery(
    { pageSize: 100, active: true },
    { skip: !canManage },
  );
  const delivererOptions = (deliverersData?.data ?? []).map((d) => ({
    value: d.id,
    label: d.name,
  }));

  const { data, isLoading, isFetching } = useListOrdersQuery({
    page,
    pageSize: PAGE_SIZE,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    delivererId: canManage ? (delivererFilter ?? undefined) : undefined,
    range: rangeTab === 'all' ? undefined : rangeTab,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Pedidos</h1>
        {canManage && (
          <Link to="/orders/new">
            <Button type="button">
              <Plus className="h-4 w-4" />
              Nuevo pedido
            </Button>
          </Link>
        )}
      </div>

      <div className="flex w-fit gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {RANGE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setRangeTab(tab.value)}
            className={clsx(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              rangeTab === tab.value
                ? 'bg-brand-600 text-white'
                : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'ALL')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="ALL">Todos los estados</option>
          {Object.values(OrderStatus).map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_LABEL[status]}
            </option>
          ))}
        </select>
        {canManage && (
          <div className="w-56">
            <SearchableSelect
              label=""
              value={delivererFilter}
              onChange={setDelivererFilter}
              options={delivererOptions}
              placeholder="Todos los mensajeros"
            />
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Dirección</th>
              <th className="px-4 py-3 font-medium">Mensajero</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              {canManage && <th className="px-4 py-3 font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && (data?.data.length ?? 0) === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  No hay pedidos que coincidan con los filtros.
                </td>
              </tr>
            )}
            {data?.data.map((order) => (
              <tr key={order.id} className="text-slate-700">
                <td className="px-4 py-3">
                  <Link
                    to={`/orders/${order.id}`}
                    className="font-medium text-slate-900 hover:text-brand-700 hover:underline"
                  >
                    #{order.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">{order.customerName}</td>
                <td className="max-w-xs truncate px-4 py-3" title={order.customerAddress}>
                  {order.customerAddress}
                </td>
                <td className="px-4 py-3">{order.delivererName ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONE[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{order.total} CUP</td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(order.orderDate)}</td>
                {canManage && (
                  <td className="px-4 py-3">
                    {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                      <Link to={`/orders/${order.id}/edit`}>
                        <Button type="button" variant="ghost">
                          <Pencil className="h-4 w-4" />
                          Editar
                        </Button>
                      </Link>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </div>
      {isFetching && !isLoading && <p className="text-xs text-slate-400">Actualizando…</p>}
    </div>
  );
}
