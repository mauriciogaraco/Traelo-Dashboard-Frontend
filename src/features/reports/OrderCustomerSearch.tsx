import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { useListOrdersQuery } from '@/features/orders/ordersApi';
import { formatDate } from '@/lib/formatDate';
import { ORDER_STATUS_LABEL } from '@/lib/labels';
import type { OrderStatus } from '@/lib/types';

const STATUS_TONE: Record<OrderStatus, 'amber' | 'brand' | 'green' | 'slate'> = {
  PENDING: 'amber',
  ASSIGNED: 'brand',
  COMPLETED: 'green',
  CANCELLED: 'slate',
};

const PAGE_SIZE = 10;

export function OrderCustomerSearch() {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(input.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timeout);
  }, [input]);

  const { data, isFetching } = useListOrdersQuery(
    { search, page, pageSize: PAGE_SIZE },
    { skip: search.length === 0 },
  );

  const rows = data?.data ?? [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4">
        <h2 className="text-sm font-semibold text-slate-900">Buscar pedido por cliente</h2>
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nombre del cliente…"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {search.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Dirección</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isFetching && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Buscando…
                  </td>
                </tr>
              )}
              {!isFetching && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Ningún pedido coincide con "{search}".
                  </td>
                </tr>
              )}
              {!isFetching &&
                rows.map((order) => (
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
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[order.status]}>
                        {ORDER_STATUS_LABEL[order.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{order.total} CUP</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(order.orderDate)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </div>
      )}
    </div>
  );
}
