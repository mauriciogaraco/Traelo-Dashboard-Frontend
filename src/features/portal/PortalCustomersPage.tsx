import { useState } from 'react';
import clsx from 'clsx';
import { formatDate } from '@/lib/formatDate';
import type { PortalCustomerSortBy } from '@/lib/types';
import { RangeTabs } from './RangeTabs';
import { useGetPortalCustomersQuery, type PortalRange } from './portalApi';

const SORT_TABS: { value: PortalCustomerSortBy; label: string }[] = [
  { value: 'orderCount', label: 'Más pedidos' },
  { value: 'totalSpent', label: 'Más compras' },
  { value: 'lastOrder', label: 'Más recientes' },
];

function formatCUP(value: number): string {
  return `${value.toLocaleString('es')} CUP`;
}

export function PortalCustomersPage() {
  // Un cliente "recurrente" necesita 2+ pedidos en el periodo, así que "Hoy" casi nunca sirve.
  const [range, setRange] = useState<PortalRange>('month');
  const [sortBy, setSortBy] = useState<PortalCustomerSortBy>('orderCount');

  const { data, isLoading } = useGetPortalCustomersQuery({ range, sortBy, limit: 20 });
  const customers = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Clientes recurrentes</h1>
        <p className="text-sm text-slate-500">
          Clientes que te compraron 2 veces o más en el periodo (top 20).
        </p>
      </div>

      <RangeTabs value={range} onChange={setRange} />

      <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        {SORT_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setSortBy(tab.value)}
            className={clsx(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              sortBy === tab.value ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Pedidos</th>
              <th className="px-4 py-3 font-medium">Total comprado</th>
              <th className="px-4 py-3 font-medium">Último pedido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && customers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Todavía no hay clientes recurrentes en este periodo.
                </td>
              </tr>
            )}
            {customers.map((customer, index) => (
              // Sin id estable a propósito: el backend no expone el teléfono del cliente.
              <tr key={`${customer.customerName}-${index}`} className="text-slate-700">
                <td className="px-4 py-3 font-medium text-slate-900">{customer.customerName}</td>
                <td className="px-4 py-3">{customer.orderCount}</td>
                <td className="px-4 py-3">{formatCUP(customer.totalSpent)}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(customer.lastOrderAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
