import { useState } from 'react';
import clsx from 'clsx';
import { Star, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { DateRangePreset } from '@/lib/types';
import { useGetDelivererBonusesQuery, type DelivererBonusDTO } from './deliverersApi';

type RangeTab = Exclude<DateRangePreset, 'custom'>;

const RANGE_TABS: { value: RangeTab; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: '6months', label: 'Semestre' },
  { value: 'year', label: 'Año' },
];

const RANK_STYLES: Record<number, string> = {
  1: 'bg-amber-100 text-amber-700 ring-amber-300',
  2: 'bg-slate-100 text-slate-600 ring-slate-300',
  3: 'bg-orange-100 text-orange-700 ring-orange-300',
};

function formatRating(value: number): string {
  return value.toLocaleString('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatPoints(value: number): string {
  return value.toLocaleString('es', { maximumFractionDigits: 1 });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

function RankBadge({ rank, hasPoints }: { rank: number; hasPoints: boolean }) {
  const style = hasPoints ? RANK_STYLES[rank] : undefined;
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

function RatingCell({ row }: { row: DelivererBonusDTO }) {
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

export function BonusesTab() {
  const [range, setRange] = useState<RangeTab>('month');
  const { data, isLoading, isError, isFetching } = useGetDelivererBonusesQuery({ range });
  const rows = data?.data.rows ?? [];
  const maxPoints = rows.reduce((max, row) => Math.max(max, row.points), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-fit gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {RANGE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setRange(tab.value)}
              className={clsx(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                range === tab.value
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Trophy className="h-4 w-4 text-amber-500" aria-hidden />
          Puntos = promedio de reseñas × mensajerías completadas
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-16 px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Mensajero</th>
              <th className="px-4 py-3 font-medium">Reseñas</th>
              <th className="px-4 py-3 text-right font-medium">Mensajerías completadas</th>
              <th className="w-44 min-w-36 px-4 py-3 font-medium">Puntos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-red-600">
                  No se pudieron cargar las bonificaciones.
                </td>
              </tr>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No hay mensajeros con actividad en este período.
                </td>
              </tr>
            )}
            {rows.map((row, index) => {
              const hasPoints = row.points > 0;
              return (
                <tr key={row.delivererId} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <RankBadge rank={index + 1} hasPoints={hasPoints} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                        {initials(row.name)}
                      </span>
                      <span className="font-medium text-slate-900">{row.name.trim()}</span>
                      {!row.active && <Badge tone="slate">Inactivo</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <RatingCell row={row} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {row.completedDeliveries}
                  </td>
                  <td className="px-4 py-3">
                    <p
                      className={clsx(
                        'text-base font-semibold tabular-nums',
                        hasPoints ? 'text-slate-900' : 'text-slate-300',
                      )}
                    >
                      {formatPoints(row.points)}
                    </p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-brand-500"
                        style={{ width: `${maxPoints > 0 ? (row.points / maxPoints) * 100 : 0}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {isFetching && !isLoading && <p className="text-xs text-slate-400">Actualizando…</p>}
      <p className="text-xs text-slate-400">
        Se cuentan las mensajerías completadas del período y las reseñas de esas mismas mensajerías.
        Sin reseñas no hay promedio, así que suman 0 puntos.
      </p>
    </div>
  );
}
