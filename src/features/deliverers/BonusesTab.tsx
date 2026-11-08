import { useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Star, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BonusSummaryModal } from './BonusSummaryModal';
import {
  useGetDelivererWeeklyBonusesQuery,
  type BonusPeriod,
  type DelivererWeeklyBonusDTO,
} from './deliverersApi';

const RANK_STYLES: Record<number, string> = {
  1: 'bg-amber-100 text-amber-700 ring-amber-300',
  2: 'bg-slate-100 text-slate-600 ring-slate-300',
  3: 'bg-orange-100 text-orange-700 ring-orange-300',
};

const PERIOD_TABS: { value: BonusPeriod; label: string }[] = [
  { value: 'day', label: 'Día' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
];

type QualifiedFilter = 'all' | 'yes' | 'no';

const DAY_MS = 24 * 60 * 60 * 1000;
const BUSINESS_TIMEZONE = 'America/Havana';

// Fecha de referencia que se manda al backend: `offset` períodos hacia atrás desde hoy.
function referenceDate(period: BonusPeriod, offset: number): Date {
  const now = new Date();
  if (period === 'day') return new Date(now.getTime() - offset * DAY_MS);
  if (period === 'week') return new Date(now.getTime() - offset * 7 * DAY_MS);
  // Mes: se retrocede al día 15, que existe en todos los meses y no se desborda al restar.
  return new Date(now.getFullYear(), now.getMonth() - offset, 15, 12);
}

function formatCup(value: number): string {
  return value.toLocaleString('es', { maximumFractionDigits: 0 });
}

function formatRating(value: number): string {
  return value.toLocaleString('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    timeZone: BUSINESS_TIMEZONE,
  });
}

function periodLabel(period: BonusPeriod, range: { from: string; to: string } | undefined): string {
  if (!range) return '…';
  if (period === 'day') {
    return new Date(range.from).toLocaleDateString('es', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: BUSINESS_TIMEZONE,
    });
  }
  if (period === 'month') {
    return new Date(range.from).toLocaleDateString('es', {
      month: 'long',
      year: 'numeric',
      timeZone: BUSINESS_TIMEZONE,
    });
  }
  return `${formatDay(range.from)} – ${formatDay(range.to)}`;
}

function offsetLabel(period: BonusPeriod, offset: number): string {
  if (offset === 0) return period === 'day' ? 'Hoy' : period === 'week' ? 'Semana en curso' : 'Mes en curso';
  if (period === 'day') return offset === 1 ? 'Ayer' : `Hace ${offset} días`;
  if (period === 'week') return `Hace ${offset} ${offset === 1 ? 'semana' : 'semanas'}`;
  return `Hace ${offset} ${offset === 1 ? 'mes' : 'meses'}`;
}

function signed(value: number | null): string {
  if (value === null) return '—';
  return value > 0 ? `+${value}%` : `${value}%`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

function RankBadge({ rank, hasBonus }: { rank: number; hasBonus: boolean }) {
  const style = hasBonus ? RANK_STYLES[rank] : undefined;
  return (
    <span
      className={clsx(
        'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
        style ? `${style} ring-2` : 'text-slate-400',
      )}
    >
      {rank}
    </span>
  );
}

function RatingCell({ row }: { row: DelivererWeeklyBonusDTO }) {
  if (row.averageRating === null) {
    return <span className="whitespace-nowrap text-slate-400">Sin reseñas</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-900">
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
      <span className="font-semibold">{formatRating(row.averageRating)}</span>
      <span className="text-slate-400">({row.reviewCount})</span>
    </span>
  );
}

// Un componente del bono (volumen / acciones / fiabilidad): verde si suma, rojo si resta, gris si 0.
function PctCell({ value, show = true }: { value: number | null; show?: boolean }) {
  if (!show || value === null) return <span className="text-slate-300">—</span>;
  return (
    <span
      className={clsx(
        'tabular-nums',
        value > 0 && 'font-medium text-emerald-700',
        value < 0 && 'font-medium text-red-600',
        value === 0 && 'text-slate-400',
      )}
    >
      {signed(value)}
    </span>
  );
}

export function BonusesTab() {
  const [period, setPeriod] = useState<BonusPeriod>('week');
  // 0 = período en curso, 1 = el anterior, etc.
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<QualifiedFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const date = referenceDate(period, offset).toISOString();
  const { data, isLoading, isError, isFetching } = useGetDelivererWeeklyBonusesQuery({ period, date });
  const allRows = data?.data.rows ?? [];
  const totals = data?.data.totals;
  const range = data?.data.week;
  const qualifiedCount = allRows.filter((row) => row.qualified).length;
  const rows = allRows.filter((row) => filter === 'all' || (filter === 'yes') === row.qualified);
  const maxBonus = allRows.reduce((max, row) => Math.max(max, row.bonusAmount), 0);
  const selected = allRows.find((row) => row.delivererId === selectedId) ?? null;

  const showComponents = period === 'week';
  const columnCount = showComponents ? 12 : 8;
  const earnLabel = period === 'day' ? 'Aporta (CUP)' : 'Gana (CUP)';

  const FILTERS: { value: QualifiedFilter; label: string; count: number }[] = [
    { value: 'all', label: 'Todos', count: allRows.length },
    { value: 'yes', label: 'Clasificaron', count: qualifiedCount },
    { value: 'no', label: 'No clasificaron', count: allRows.length - qualifiedCount },
  ];

  function changePeriod(next: BonusPeriod) {
    setPeriod(next);
    setOffset(0);
    setSelectedId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex w-fit gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {PERIOD_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => changePeriod(tab.value)}
                className={clsx(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  period === tab.value ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setOffset((n) => n + 1)} aria-label="Anterior">
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
            <div className="min-w-44 text-center">
              <p className="text-sm font-semibold capitalize text-slate-900">{periodLabel(period, range)}</p>
              <p className="text-xs text-slate-500">{offsetLabel(period, offset)}</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => setOffset((n) => Math.max(0, n - 1))}
              disabled={offset === 0}
              aria-label="Siguiente"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
            {offset > 0 && (
              <Button variant="ghost" onClick={() => setOffset(0)}>
                Volver a hoy
              </Button>
            )}
          </div>
        </div>
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Trophy className="h-4 w-4 text-amber-500" aria-hidden />
          Bono = % del servicio de la semana (volumen + reseñas + fiabilidad, máx. 11%)
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={clsx(
              'rounded-full border px-3 py-1 text-sm font-medium transition-colors',
              filter === item.value
                ? 'border-brand-600 bg-brand-50 text-brand-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            {item.label} <span className="tabular-nums text-slate-400">{item.count}</span>
          </button>
        ))}
        <span className="text-xs text-slate-400">Toca un mensajero para ver su resumen</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-16 px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Mensajero</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Servicio (CUP)</th>
              <th className="px-4 py-3 text-right font-medium">Entregas</th>
              <th className="px-4 py-3 text-right font-medium">Cancel.</th>
              <th className="px-4 py-3 font-medium">Reseñas</th>
              {showComponents && (
                <>
                  <th className="px-4 py-3 text-right font-medium">Volumen</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  <th className="px-4 py-3 text-right font-medium">Fiabilidad</th>
                </>
              )}
              <th className="px-4 py-3 text-right font-medium">
                {period === 'day' ? 'Bono semana' : period === 'month' ? 'Bono efectivo' : 'Bono'}
              </th>
              <th className="w-44 min-w-36 px-4 py-3 font-medium">{earnLabel}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={columnCount} className="px-4 py-10 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={columnCount} className="px-4 py-10 text-center text-red-600">
                  No se pudieron cargar las bonificaciones.
                </td>
              </tr>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="px-4 py-10 text-center text-slate-400">
                  No hay mensajeros con actividad en este período.
                </td>
              </tr>
            )}
            {rows.map((row, index) => {
              const worked = row.completedDeliveries > 0;
              const cancelPct = Math.round((1 - row.completionRate) * 100);
              return (
                <tr
                  key={row.delivererId}
                  onClick={() => setSelectedId(row.delivererId)}
                  className={clsx(
                    'cursor-pointer transition-colors hover:bg-slate-50',
                    !row.qualified && 'bg-slate-50/50',
                  )}
                >
                  <td className="px-4 py-3">
                    <RankBadge rank={index + 1} hasBonus={row.qualified} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                        {initials(row.name)}
                      </span>
                      <span className={clsx('font-medium', row.qualified ? 'text-slate-900' : 'text-slate-500')}>
                        {row.name.trim()}
                      </span>
                      {!row.active && <Badge tone="slate">Inactivo</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {row.qualified ? (
                      <Badge tone="green">Clasificó</Badge>
                    ) : (
                      <Badge tone="slate">No clasificó</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {formatCup(row.serviceTotal)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {row.completedDeliveries}
                  </td>
                  <td
                    className={clsx(
                      'px-4 py-3 text-right tabular-nums',
                      row.cancelledDeliveries > 0 ? 'text-slate-700' : 'text-slate-300',
                    )}
                  >
                    {row.cancelledDeliveries > 0 ? `${row.cancelledDeliveries} (${cancelPct}%)` : '0'}
                  </td>
                  <td className="px-4 py-3">
                    <RatingCell row={row} />
                  </td>
                  {showComponents && (
                    <>
                      <td className="px-4 py-3 text-right">
                        <PctCell value={row.volumePct} show={worked} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <PctCell value={row.actionsPct} show={worked} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <PctCell value={row.reliabilityPct} show={worked} />
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                    {worked ? `${row.bonusPct}%` : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <p
                      className={clsx(
                        'text-base font-semibold tabular-nums',
                        row.bonusAmount > 0 ? 'text-slate-900' : 'text-slate-300',
                      )}
                    >
                      {formatCup(row.bonusAmount)}
                    </p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-brand-500"
                        style={{ width: `${maxBonus > 0 ? (row.bonusAmount / maxBonus) * 100 : 0}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {totals && allRows.length > 0 && (
            <tfoot className="border-t border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900">
              <tr>
                <td className="px-4 py-3" colSpan={3}>
                  {period === 'day' ? 'Total del día' : period === 'month' ? 'Total del mes' : 'Total de la semana'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCup(totals.serviceTotal)}</td>
                <td className="px-4 py-3" colSpan={showComponents ? 6 : 3} />
                <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                  {totals.serviceTotal > 0
                    ? `${((100 * totals.bonusAmount) / totals.serviceTotal).toFixed(1)}%`
                    : ''}
                </td>
                <td className="px-4 py-3 tabular-nums">{formatCup(totals.bonusAmount)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {isFetching && !isLoading && <p className="text-xs text-slate-400">Actualizando…</p>}

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600 shadow-sm">
        <p className="mb-2 font-semibold text-slate-800">Cómo se calcula (semana de lunes a domingo)</p>
        <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-3">
          <li>
            <span className="font-medium text-slate-800">Volumen</span> (servicio de la semana): desde
            2.000 → 2% · 4.000 → 3% · 7.000 → 4% · 10.000 → 5% · 14.000 → 6%
          </li>
          <li>
            <span className="font-medium text-slate-800">Acciones</span> (reseñas recibidas): 3 → +1% · 6
            → +2% · 10 → +3%
          </li>
          <li>
            <span className="font-medium text-slate-800">Fiabilidad</span> (completadas ÷ completadas +
            canceladas): 95% o más → +2% · 90% → +1% · 85% → −1% · menos → −2%
          </li>
        </ul>
        <p className="mt-2 text-slate-400">
          Clasificó = gana algo en el período. El bono nunca baja de 0% ni pasa de 11% y se paga sobre el
          servicio de las entregas completadas. El día aporta su servicio × el % que lleva su semana; el
          mes suma las semanas que empiezan dentro de él. Las cancelaciones cuentan todas, sin distinguir
          quién las originó.
        </p>
      </div>

      {selected && (
        <BonusSummaryModal
          row={selected}
          period={period}
          date={date}
          inProgress={offset === 0}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
