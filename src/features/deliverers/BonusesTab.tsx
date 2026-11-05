import { useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Star, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useGetDelivererWeeklyBonusesQuery, type DelivererWeeklyBonusDTO } from './deliverersApi';

const RANK_STYLES: Record<number, string> = {
  1: 'bg-amber-100 text-amber-700 ring-amber-300',
  2: 'bg-slate-100 text-slate-600 ring-slate-300',
  3: 'bg-orange-100 text-orange-700 ring-orange-300',
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const BUSINESS_TIMEZONE = 'America/Havana';

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

function signed(value: number): string {
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
function PctCell({ value, show = true }: { value: number; show?: boolean }) {
  if (!show) return <span className="text-slate-300">—</span>;
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
  // 0 = semana en curso, 1 = la anterior, etc.
  const [weeksAgo, setWeeksAgo] = useState(0);
  const { data, isLoading, isError, isFetching } = useGetDelivererWeeklyBonusesQuery({
    week: new Date(Date.now() - weeksAgo * WEEK_MS).toISOString(),
  });
  const rows = data?.data.rows ?? [];
  const totals = data?.data.totals;
  const week = data?.data.week;
  const maxBonus = rows.reduce((max, row) => Math.max(max, row.bonusAmount), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setWeeksAgo((n) => n + 1)}
            aria-label="Semana anterior"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <div className="min-w-44 text-center">
            <p className="text-sm font-semibold text-slate-900">
              {week ? `${formatDay(week.from)} – ${formatDay(week.to)}` : '…'}
            </p>
            <p className="text-xs text-slate-500">
              {weeksAgo === 0
                ? 'Semana en curso'
                : `Hace ${weeksAgo} ${weeksAgo === 1 ? 'semana' : 'semanas'}`}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => setWeeksAgo((n) => Math.max(0, n - 1))}
            disabled={weeksAgo === 0}
            aria-label="Semana siguiente"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
          {weeksAgo > 0 && (
            <Button variant="ghost" onClick={() => setWeeksAgo(0)}>
              Esta semana
            </Button>
          )}
        </div>
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Trophy className="h-4 w-4 text-amber-500" aria-hidden />
          Bono = % del servicio de la semana (volumen + reseñas + fiabilidad, máx. 11%)
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-16 px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Mensajero</th>
              <th className="px-4 py-3 text-right font-medium">Servicio (CUP)</th>
              <th className="px-4 py-3 text-right font-medium">Entregas</th>
              <th className="px-4 py-3 text-right font-medium">Cancel.</th>
              <th className="px-4 py-3 font-medium">Reseñas</th>
              <th className="px-4 py-3 text-right font-medium">Volumen</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
              <th className="px-4 py-3 text-right font-medium">Fiabilidad</th>
              <th className="px-4 py-3 text-right font-medium">Bono</th>
              <th className="w-44 min-w-36 px-4 py-3 font-medium">Gana (CUP)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-red-600">
                  No se pudieron cargar las bonificaciones.
                </td>
              </tr>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-slate-400">
                  No hay mensajeros con actividad en esta semana.
                </td>
              </tr>
            )}
            {rows.map((row, index) => {
              const hasBonus = row.bonusAmount > 0;
              const worked = row.completedDeliveries > 0;
              const cancelPct = Math.round((1 - row.completionRate) * 100);
              return (
                <tr key={row.delivererId} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <RankBadge rank={index + 1} hasBonus={hasBonus} />
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
                    {row.cancelledDeliveries > 0
                      ? `${row.cancelledDeliveries} (${cancelPct}%)`
                      : '0'}
                  </td>
                  <td className="px-4 py-3">
                    <RatingCell row={row} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <PctCell value={row.volumePct} show={worked} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <PctCell value={row.actionsPct} show={worked} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <PctCell value={row.reliabilityPct} show={worked} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                    {worked ? `${row.bonusPct}%` : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <p
                      className={clsx(
                        'text-base font-semibold tabular-nums',
                        hasBonus ? 'text-slate-900' : 'text-slate-300',
                      )}
                    >
                      {formatCup(row.bonusAmount)}
                    </p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-brand-500"
                        style={{
                          width: `${maxBonus > 0 ? (row.bonusAmount / maxBonus) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {totals && rows.length > 0 && (
            <tfoot className="border-t border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900">
              <tr>
                <td className="px-4 py-3" colSpan={2}>
                  Total de la semana
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatCup(totals.serviceTotal)}
                </td>
                <td className="px-4 py-3" colSpan={6} />
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
        <p className="mb-2 font-semibold text-slate-800">
          Cómo se calcula (semana de lunes a domingo)
        </p>
        <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-3">
          <li>
            <span className="font-medium text-slate-800">Volumen</span> (servicio de la semana):
            desde 2.000 → 2% · 4.000 → 3% · 7.000 → 4% · 10.000 → 5% · 14.000 → 6%
          </li>
          <li>
            <span className="font-medium text-slate-800">Acciones</span> (reseñas recibidas): 3 →
            +1% · 6 → +2% · 10 → +3%
          </li>
          <li>
            <span className="font-medium text-slate-800">Fiabilidad</span> (completadas ÷
            completadas + canceladas): 95% o más → +2% · 90% → +1% · 85% → −1% · menos → −2%
          </li>
        </ul>
        <p className="mt-2 text-slate-400">
          El bono nunca baja de 0% ni pasa de 11% y se paga sobre el servicio de las entregas
          completadas. Las cancelaciones cuentan todas, sin distinguir quién las originó.
        </p>
      </div>
    </div>
  );
}
