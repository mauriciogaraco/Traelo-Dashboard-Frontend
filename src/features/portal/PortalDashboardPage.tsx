import { useState } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Clock, DollarSign, PackageCheck, ShoppingBag, Trophy, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RangeTabs } from './RangeTabs';
import { useGetMyBusinessQuery, useGetPortalSummaryQuery, type PortalRange } from './portalApi';

function formatCUP(value: number): string {
  return `${value.toLocaleString('es')} CUP`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  highlight,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  sublabel?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={clsx(
        'rounded-xl border p-4 shadow-sm',
        highlight ? 'border-brand-200 bg-brand-50' : 'border-slate-200 bg-white',
      )}
    >
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <p className="text-xs uppercase tracking-wide">{label}</p>
      </div>
      <p className={clsx('mt-2 text-lg font-semibold', highlight ? 'text-brand-700' : 'text-slate-900')}>
        {value}
      </p>
      {sublabel && <p className="mt-0.5 text-xs text-slate-400">{sublabel}</p>}
    </div>
  );
}

export function PortalDashboardPage() {
  const [range, setRange] = useState<PortalRange>('today');
  const { data: businessData } = useGetMyBusinessQuery();
  const { data, isLoading, isFetching, error } = useGetPortalSummaryQuery({ range });

  const business = businessData?.data;
  const summary = data?.data;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
          {business && <p className="text-sm text-slate-500">{business.name}</p>}
        </div>
        {isFetching && !isLoading && <p className="text-xs text-slate-400">Actualizando…</p>}
      </div>

      <RangeTabs value={range} onChange={setRange} />

      {isLoading && <p className="text-slate-400">Cargando…</p>}
      {error && (
        <p className="text-sm text-red-600">
          No se pudo cargar el resumen. Si el problema sigue, avisale a Tráelo que tu cuenta no
          tiene un negocio asignado.
        </p>
      )}

      {summary && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={ShoppingBag}
              label="Ventas"
              value={formatCUP(summary.salesTotal)}
              sublabel="Productos de tu negocio en pedidos completados"
              highlight
            />
            <StatCard
              icon={PackageCheck}
              label="Pedidos completados"
              value={`${summary.completedOrders} / ${summary.totalOrders}`}
              sublabel={`${summary.completionRate.toFixed(0)}% completados`}
            />
            <StatCard
              icon={Clock}
              label="En curso ahora"
              value={summary.activeOrders}
              sublabel="Pendientes o asignados"
            />
            <StatCard icon={DollarSign} label="Ticket promedio" value={formatCUP(summary.averageTicket)} />
            <StatCard icon={Trophy} label="Pedido más grande" value={formatCUP(summary.maxOrder)} />
            <StatCard icon={XCircle} label="Cancelados" value={summary.cancelledOrders} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Productos más vendidos</h2>
              <Link to="/customers" className="text-xs text-brand-600 hover:underline">
                Ver clientes recurrentes
              </Link>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Unidades</th>
                  <th className="px-4 py-3 font-medium">Ventas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.topProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                      Sin ventas en este periodo.
                    </td>
                  </tr>
                )}
                {summary.topProducts.map((product) => (
                  <tr key={product.productName} className="text-slate-700">
                    <td className="px-4 py-3 font-medium text-slate-900">{product.productName}</td>
                    <td className="px-4 py-3">{product.quantity}</td>
                    <td className="px-4 py-3">{formatCUP(product.totalSales)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
