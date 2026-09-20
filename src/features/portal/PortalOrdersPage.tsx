import { Fragment, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { formatDateTime } from '@/lib/formatDate';
import { ORDER_STATUS_LABEL } from '@/lib/labels';
import { OrderStatus } from '@/lib/types';
import { RangeTabs } from './RangeTabs';
import { useListPortalOrdersQuery, type PortalRange } from './portalApi';

const PAGE_SIZE = 15;

const STATUS_TONE: Record<OrderStatus, 'amber' | 'brand' | 'green' | 'slate'> = {
  PENDING: 'amber',
  ASSIGNED: 'brand',
  COMPLETED: 'green',
  CANCELLED: 'slate',
};

function formatCUP(value: number): string {
  return `${value.toLocaleString('es')} CUP`;
}

export function PortalOrdersPage() {
  const [page, setPage] = useState(1);
  const [range, setRange] = useState<PortalRange | 'all'>('today');
  const [status, setStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(input.trim()), 350);
    return () => clearTimeout(timeout);
  }, [input]);

  useEffect(() => {
    setPage(1);
    setExpandedId(null);
  }, [range, status, search]);

  const { data, isLoading, isFetching } = useListPortalOrdersQuery({
    page,
    pageSize: PAGE_SIZE,
    range: range === 'all' ? undefined : range,
    status: status === 'ALL' ? undefined : status,
    search: search || undefined,
  });

  const orders = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Pedidos</h1>

      <RangeTabs value={range} onChange={setRange} includeAll />

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | 'ALL')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="ALL">Todos los estados</option>
          {Object.values(OrderStatus).map((value) => (
            <option key={value} value={value}>
              {ORDER_STATUS_LABEL[value]}
            </option>
          ))}
        </select>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Buscar por nombre del cliente…"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-8 px-2 py-3" />
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Tu venta</th>
              <th className="px-4 py-3 font-medium">Mensajero</th>
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
            {!isLoading && orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No hay pedidos que coincidan con los filtros.
                </td>
              </tr>
            )}
            {orders.map((order) => {
              const isOpen = expandedId === order.id;
              return (
                <Fragment key={order.id}>
                  <tr
                    className="cursor-pointer text-slate-700 hover:bg-slate-50"
                    onClick={() => setExpandedId(isOpen ? null : order.id)}
                  >
                    <td className="px-2 py-3 text-slate-400">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">#{order.orderNumber}</td>
                    <td className="px-4 py-3">{order.customerName}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{formatCUP(order.subtotal)}</td>
                    <td className="px-4 py-3">{order.delivererName ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(order.orderDate)}</td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-slate-50">
                      <td />
                      <td colSpan={6} className="px-4 py-3">
                        <ul className="space-y-1 text-sm text-slate-700">
                          {order.items.map((item) => (
                            <li key={item.id} className="flex justify-between gap-4">
                              <span>
                                {item.quantity}× {item.productName}
                              </span>
                              <span className="font-medium text-slate-900">
                                {formatCUP(item.subtotal)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </div>
      {isFetching && !isLoading && <p className="text-xs text-slate-400">Actualizando…</p>}
    </div>
  );
}
