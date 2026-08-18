import { useState } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Bike, PackageCheck, Percent, ShoppingBag, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DateRangePreset } from '@/lib/types';
import { useGetSalesReportQuery, useGetTopBusinessesQuery, useGetTopDeliverersQuery } from './reportsApi';

type RangeTab = Exclude<DateRangePreset, 'custom'>;

const RANGE_TABS: { value: RangeTab; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: '6months', label: 'Semestre' },
  { value: 'year', label: 'Año' },
];

const TOP_LIMIT = 10;

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

export function ReportsPage() {
  const [range, setRange] = useState<RangeTab>('today');

  const { data: salesData, isLoading: isSalesLoading } = useGetSalesReportQuery({ range });
  const { data: topBusinessesData, isLoading: isTopBusinessesLoading } = useGetTopBusinessesQuery({
    range,
    limit: TOP_LIMIT,
  });
  const { data: topDeliverersData, isLoading: isTopDeliverersLoading } = useGetTopDeliverersQuery({
    range,
    limit: TOP_LIMIT,
  });

  const sales = salesData?.data;
  const topBusinesses = topBusinessesData?.data ?? [];
  const topDeliverers = topDeliverersData?.data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-slate-900">Reportes</h1>

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

      {isSalesLoading && <p className="text-slate-400">Cargando…</p>}

      {sales && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={ShoppingBag} label="Ventas de negocios" value={formatCUP(sales.businessSalesGross)} />
          <StatCard
            icon={Wallet}
            label="Servicio Tráelo cobrado"
            value={formatCUP(sales.platformFeeRevenue)}
            highlight
          />
          <StatCard icon={Bike} label="Mensajería" value={formatCUP(sales.deliveryFeeGross)} />
          <StatCard
            icon={PackageCheck}
            label="Pedidos completados"
            value={`${sales.completedOrders} / ${sales.totalOrders}`}
          />
          <StatCard icon={Percent} label="Ganancia total Tráelo" value={formatCUP(sales.traeloTotalRevenue)} />
          <StatCard
            icon={Bike}
            label="Mensajería — parte del mensajero"
            value={formatCUP(sales.delivererShareTotal)}
          />
          <StatCard
            icon={Bike}
            label="Mensajería — parte de Tráelo"
            value={formatCUP(sales.traeloDeliveryShareTotal)}
          />
          <StatCard icon={ShoppingBag} label="Ticket promedio" value={formatCUP(sales.averageTicket)} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Top negocios</h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Negocio</th>
                <th className="px-4 py-3 font-medium">Ventas</th>
                <th className="px-4 py-3 font-medium">Comisión</th>
                <th className="px-4 py-3 font-medium">Pedidos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isTopBusinessesLoading && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    Cargando…
                  </td>
                </tr>
              )}
              {!isTopBusinessesLoading && topBusinesses.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    Sin datos en este periodo.
                  </td>
                </tr>
              )}
              {topBusinesses.map((business) => (
                <tr key={business.businessId} className="text-slate-700">
                  <td className="px-4 py-3 font-medium text-slate-900">{business.businessName}</td>
                  <td className="px-4 py-3">{formatCUP(business.totalSales)}</td>
                  <td className="px-4 py-3">{formatCUP(business.totalCommission)}</td>
                  <td className="px-4 py-3">{business.orderCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Top mensajeros</h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Mensajero</th>
                <th className="px-4 py-3 font-medium">Entregas</th>
                <th className="px-4 py-3 font-medium">Ganancias</th>
                <th className="px-4 py-3 font-medium">Servicio Tráelo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isTopDeliverersLoading && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    Cargando…
                  </td>
                </tr>
              )}
              {!isTopDeliverersLoading && topDeliverers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    Sin datos en este periodo.
                  </td>
                </tr>
              )}
              {topDeliverers.map((deliverer) => (
                <tr key={deliverer.delivererId} className="text-slate-700">
                  <td className="px-4 py-3 font-medium text-slate-900">{deliverer.delivererName}</td>
                  <td className="px-4 py-3">{deliverer.deliveryCount}</td>
                  <td className="px-4 py-3">{formatCUP(deliverer.totalEarnings)}</td>
                  <td className="px-4 py-3">{formatCUP(deliverer.platformFeeCollected)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
