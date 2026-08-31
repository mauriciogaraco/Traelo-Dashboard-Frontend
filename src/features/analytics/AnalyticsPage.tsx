import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Repeat, Sparkles, TrendingDown, TrendingUp, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DateRangePreset } from '@/lib/types';
import { CustomerTrendChart } from './CustomerTrendChart';
import { RetentionRateChart } from './RetentionRateChart';
import { RetentionCohortsTable } from './RetentionCohortsTable';
import { DemandByHourChart } from './DemandByHourChart';
import {
  useGetCustomerSegmentationQuery,
  useGetCustomerTrendQuery,
  useGetDemandByHourQuery,
  useGetProductsByHourQuery,
} from './analyticsApi';

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

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
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

export function AnalyticsPage() {
  const [range, setRange] = useState<RangeTab>('today');
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const { data: segmentationData, isLoading: isLoadingSegmentation } = useGetCustomerSegmentationQuery({
    range,
  });
  const segmentation = segmentationData?.data;

  const { data: trendData, isLoading: isLoadingTrend } = useGetCustomerTrendQuery({ range });
  const trend = useMemo(() => trendData?.data ?? [], [trendData]);

  const { data: demandData, isLoading: isLoadingDemand } = useGetDemandByHourQuery({ range });
  const demand = useMemo(() => demandData?.data ?? [], [demandData]);

  const { peakHour, lowHour } = useMemo(() => {
    if (demand.length === 0) return { peakHour: null, lowHour: null };
    const withOrders = demand.filter((d) => d.orderCount > 0);
    if (withOrders.length === 0) return { peakHour: null, lowHour: null };
    const peak = withOrders.reduce((a, b) => (b.orderCount > a.orderCount ? b : a));
    const low = withOrders.reduce((a, b) => (b.orderCount < a.orderCount ? b : a));
    return { peakHour: peak, lowHour: low };
  }, [demand]);

  const { data: productsData, isLoading: isLoadingProducts } = useGetProductsByHourQuery(
    { range, hour: selectedHour ?? 0, limit: 10 },
    { skip: selectedHour === null },
  );
  const products = productsData?.data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-slate-900">Analytics</h1>

      <div className="flex w-fit gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {RANGE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setRange(tab.value);
              setSelectedHour(null);
            }}
            className={clsx(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              range === tab.value ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoadingSegmentation && <p className="text-slate-400">Cargando…</p>}

      {segmentation && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={Sparkles}
            label="Clientes nuevos"
            value={segmentation.newCustomers}
            sublabel={formatCUP(segmentation.newCustomersRevenue)}
            highlight
          />
          <StatCard
            icon={Repeat}
            label="Clientes recurrentes"
            value={segmentation.recurringCustomers}
            sublabel={formatCUP(segmentation.recurringCustomersRevenue)}
          />
          <StatCard icon={Users} label="Total de clientes" value={segmentation.totalCustomers} />
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">
          Nuevos vs. recurrentes en el tiempo
        </h2>
        <p className="mb-3 text-xs text-slate-400">
          Cuántos clientes de cada tipo hicieron pedidos cada día — cómo entran y cómo se quedan.
        </p>
        {isLoadingTrend && <p className="text-slate-400">Cargando…</p>}
        {!isLoadingTrend && trend.length > 0 && <CustomerTrendChart data={trend} />}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Tasa de retención</h2>
        <p className="mb-3 text-xs text-slate-400">
          % de los clientes de cada día que ya eran recurrentes — a más alto, más fidelización.
        </p>
        {isLoadingTrend && <p className="text-slate-400">Cargando…</p>}
        {!isLoadingTrend && trend.length > 0 && <RetentionRateChart data={trend} />}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Pedidos por hora del día</h2>
          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            {peakHour && (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-brand-600" />
                Pico: {formatHour(peakHour.hour)} ({peakHour.orderCount})
              </span>
            )}
            {lowHour && (
              <span className="flex items-center gap-1">
                <TrendingDown className="h-3.5 w-3.5 text-slate-400" />
                Menor demanda: {formatHour(lowHour.hour)} ({lowHour.orderCount})
              </span>
            )}
          </div>
        </div>
        <p className="mb-3 text-xs text-slate-400">Hora local de Cuba. Hacé clic en una barra para ver sus productos.</p>

        {isLoadingDemand && <p className="text-slate-400">Cargando…</p>}
        {!isLoadingDemand && demand.length > 0 && (
          <DemandByHourChart data={demand} selectedHour={selectedHour} onSelectHour={setSelectedHour} />
        )}

        {selectedHour !== null && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">
              Productos más vendidos a las {formatHour(selectedHour)}
            </h3>
            {isLoadingProducts && <p className="text-slate-400">Cargando…</p>}
            {!isLoadingProducts && products.length === 0 && (
              <p className="text-sm text-slate-400">Sin ventas en esta hora, en este periodo.</p>
            )}
            {!isLoadingProducts && products.length > 0 && (
              <ul className="divide-y divide-slate-100 text-sm">
                {products.map((product) => (
                  <li
                    key={`${product.businessId}-${product.productId ?? ''}-${product.productName}`}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <span className="text-slate-700">
                      {product.productName}{' '}
                      <span className="text-xs text-slate-400">({product.businessName})</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-slate-500">{product.quantity} und.</span>
                      <span className="font-medium text-slate-900">{formatCUP(product.totalSales)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <RetentionCohortsTable />
    </div>
  );
}
