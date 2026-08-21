import { useState } from 'react';
import clsx from 'clsx';
import { useListBusinessesQuery } from '@/features/businesses/businessesApi';
import { useGetBusinessBreakdownByDelivererQuery } from '@/features/reports/reportsApi';
import type { DateRangePreset } from '@/lib/types';

const BUSINESS_NAME = 'Cronos';

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

export function CronosPage() {
  const [range, setRange] = useState<RangeTab>('today');

  const { data: businessesData, isLoading: isLoadingBusiness } = useListBusinessesQuery({
    search: BUSINESS_NAME,
    pageSize: 5,
  });
  const business = (businessesData?.data ?? []).find(
    (b) => b.name.trim().toLowerCase() === BUSINESS_NAME.toLowerCase(),
  );

  const { data: breakdownData, isLoading: isLoadingBreakdown } =
    useGetBusinessBreakdownByDelivererQuery({ businessId: business?.id ?? '', range }, { skip: !business });

  const breakdown = breakdownData?.data ?? [];
  const grandTotalQuantity = breakdown.reduce((sum, d) => sum + d.totalQuantity, 0);
  const grandTotalSales = breakdown.reduce((sum, d) => sum + d.totalSales, 0);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-slate-900">Cronos</h1>

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

      {isLoadingBusiness && <p className="text-slate-400">Cargando…</p>}

      {!isLoadingBusiness && !business && (
        <p className="text-slate-400">
          No se encontró un negocio llamado "{BUSINESS_NAME}". Revisá que exista y esté activo en
          Negocios.
        </p>
      )}

      {business && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total Cronos vendidos</p>
              <p className="mt-1 text-lg font-semibold text-brand-700">{grandTotalQuantity}</p>
            </div>
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total en CUP</p>
              <p className="mt-1 text-lg font-semibold text-brand-700">{formatCUP(grandTotalSales)}</p>
            </div>
          </div>

          {isLoadingBreakdown && <p className="text-slate-400">Cargando…</p>}

          {!isLoadingBreakdown && breakdown.length === 0 && (
            <p className="text-slate-400">Sin ventas de Cronos en este periodo.</p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {breakdown.map((entry) => (
              <div
                key={entry.delivererId}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <h2 className="mb-2 text-sm font-semibold text-slate-900">{entry.delivererName}</h2>
                <ul className="space-y-1 text-sm text-slate-700">
                  {entry.products.map((product) => (
                    <li
                      key={`${product.productId ?? ''}-${product.productName}`}
                      className="flex justify-between gap-3"
                    >
                      <span>
                        {product.quantity} {product.productName}
                      </span>
                      <span className="font-medium text-slate-900">
                        {formatCUP(product.totalSales)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-sm font-semibold text-slate-900">
                  <span>Total ({entry.totalQuantity})</span>
                  <span>{formatCUP(entry.totalSales)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
