import { useState } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Bike, DollarSign, PackageCheck, Percent, ShoppingBag, Store, Users, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import type { DateRangePreset } from '@/lib/types';
import { useGetDashboardSummaryQuery } from './dashboardApi';

type RangeTab = Exclude<DateRangePreset, 'custom'>;

const RANGE_TABS: { value: RangeTab; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: '6months', label: 'Semestre' },
  { value: 'year', label: 'Año' },
];

function formatCUP(value: number): string {
  return `${value.toLocaleString('es')} CUP`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
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
    </div>
  );
}

export function DashboardPage() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const isDeliverer = currentUser?.role === 'DELIVERER';
  const [range, setRange] = useState<RangeTab>('today');

  const { data, isLoading, isFetching } = useGetDashboardSummaryQuery(
    { range },
    { skip: isDeliverer },
  );

  // El backend solo autoriza OWNER/ADMIN/EMPLOYEE en /dashboard/summary; un mensajero
  // que caiga en "/" (ruta índice, sin RoleGate) va directo a su vista real.
  if (isDeliverer) {
    return <Navigate to="/orders" replace />;
  }

  const summary = data?.data;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        {isFetching && !isLoading && <p className="text-xs text-slate-400">Actualizando…</p>}
      </div>

      <div className="flex w-fit gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {RANGE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setRange(tab.value)}
            className={clsx(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              range === tab.value ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-slate-400">Cargando…</p>}

      {summary && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={ShoppingBag} label="Ventas de negocios" value={formatCUP(summary.businessSalesGross)} />
            <StatCard icon={Wallet} label="Servicio Tráelo" value={formatCUP(summary.platformFeeRevenue)} />
            <StatCard icon={Bike} label="Mensajería" value={formatCUP(summary.deliveryFeeGross)} />
            <StatCard icon={Users} label="Mensajeros activos" value={summary.delivererCount} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={PackageCheck}
              label="Pedidos completados"
              value={`${summary.completedOrders} / ${summary.totalOrders}`}
            />
            <StatCard icon={DollarSign} label="Ticket promedio" value={formatCUP(summary.averageTicket)} />
            <StatCard icon={Store} label="Negocios activos" value={summary.businessCount} />
            <StatCard
              icon={Percent}
              label="Ganancia total Tráelo"
              value={formatCUP(summary.traeloTotalRevenue)}
              highlight
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Negocio top</h2>
              {summary.topBusiness ? (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Nombre</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {summary.topBusiness.businessName}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Ventas</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {formatCUP(summary.topBusiness.totalSales)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Pedidos</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {summary.topBusiness.orderCount}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-slate-400">Sin datos en este periodo.</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Mensajero top</h2>
              {summary.topDeliverer ? (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Nombre</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {summary.topDeliverer.delivererName}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Entregas</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {summary.topDeliverer.deliveryCount}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Ganancias</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {formatCUP(summary.topDeliverer.totalEarnings)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-slate-400">Sin datos en este periodo.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
