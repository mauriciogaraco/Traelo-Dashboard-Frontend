import clsx from 'clsx';
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { nextActionTier, nextVolumeTier } from './bonusTiers';
import {
  useGetDelivererWeeklyBonusesQuery,
  type BonusPeriod,
  type DelivererWeeklyBonusDTO,
} from './deliverersApi';

const BUSINESS_TIMEZONE = 'America/Havana';

function formatCup(value: number): string {
  return value.toLocaleString('es', { maximumFractionDigits: 0 });
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    timeZone: BUSINESS_TIMEZONE,
  });
}

function signed(value: number | null): string {
  if (value === null) return '—';
  return value > 0 ? `+${value}%` : `${value}%`;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function Component({ label, detail, value }: { label: string; detail: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
      <span
        className={clsx(
          'shrink-0 text-sm font-semibold tabular-nums',
          value !== null && value > 0 && 'text-emerald-700',
          value !== null && value < 0 && 'text-red-600',
          (value === null || value === 0) && 'text-slate-400',
        )}
      >
        {signed(value)}
      </span>
    </div>
  );
}

interface BonusSummaryModalProps {
  row: DelivererWeeklyBonusDTO;
  period: BonusPeriod;
  // Cualquier fecha dentro del período mostrado (ISO), para buscar la semana del mensajero en el día.
  date: string;
  // true = el período todavía no terminó: el bono es lo que lleva, no lo definitivo.
  inProgress: boolean;
  onClose: () => void;
}

export function BonusSummaryModal({ row, period, date, inProgress, onClose }: BonusSummaryModalProps) {
  // En el día el bono es un aporte de la semana: se trae la semana para decir cuánto gana en total.
  const { data: weekData } = useGetDelivererWeeklyBonusesQuery(
    { period: 'week', date },
    { skip: period !== 'day' },
  );
  const weekRow = weekData?.data.rows.find((r) => r.delivererId === row.delivererId);

  const worked = row.completedDeliveries > 0;
  const cancelPct = Math.round((1 - row.completionRate) * 100);
  const total = period === 'day' ? weekRow : row;
  const periodWord = period === 'month' ? 'el mes' : 'la semana';
  // Lo que hay que pagarle: el bono del período; en el día, el de su semana.
  const payable = period === 'day' ? weekRow?.bonusAmount : row.bonusAmount;

  const volumeHint = period === 'week' && row.volumePct !== null ? nextVolumeTier(row.serviceTotal, row.volumePct) : null;
  const actionsHint = period === 'week' && row.actionsPct !== null ? nextActionTier(row.reviewCount, row.actionsPct) : null;

  return (
    <Modal title={row.name.trim()} onClose={onClose} widthClassName="max-w-xl">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          {row.qualified ? (
            <Badge tone="green">Clasificó al bono</Badge>
          ) : (
            <Badge tone="slate">No clasificó al bono</Badge>
          )}
          {!row.active && <Badge tone="slate">Inactivo</Badge>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">
              {period === 'day' ? 'Generó hoy' : `Generó en ${periodWord}`}
            </p>
            <p className="text-3xl font-bold tabular-nums text-slate-900">
              {formatCup(row.serviceTotal)} <span className="text-lg font-semibold">CUP</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              de mensajería · {row.completedDeliveries}{' '}
              {row.completedDeliveries === 1 ? 'entrega' : 'entregas'}
            </p>
          </div>
          <div className="rounded-xl bg-brand-50 p-4">
            <p className="text-sm text-brand-800">
              {period === 'day'
                ? 'Bonificación de la semana a darle'
                : `Bonificación a darle${inProgress ? ' (hasta ahora)' : ''}`}
            </p>
            <p className="text-3xl font-bold tabular-nums text-brand-900">
              {payable === undefined ? '…' : formatCup(payable)}{' '}
              <span className="text-lg font-semibold">CUP</span>
            </p>
            <p className="mt-1 text-xs text-brand-800">
              {period === 'day'
                ? `${row.bonusPct}% que lleva la semana · hoy aporta ${formatCup(row.bonusAmount)} CUP`
                : period === 'month'
                  ? `${row.bonusPct}% efectivo: suma de los bonos de sus semanas`
                  : `${row.bonusPct}% de ${formatCup(row.serviceTotal)} CUP de servicio`}
              {inProgress && period !== 'day' && ' · si se mantiene así hasta el final'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={period === 'day' ? 'Servicio del día' : 'Servicio'} value={`${formatCup(row.serviceTotal)}`} hint="CUP" />
          <Stat label="Entregas" value={String(row.completedDeliveries)} />
          <Stat
            label="Cancelaciones"
            value={String(row.cancelledDeliveries)}
            hint={row.cancelledDeliveries > 0 ? `${cancelPct}% de los pedidos` : undefined}
          />
          <Stat
            label="Reseñas"
            value={String(row.reviewCount)}
            hint={row.averageRating !== null ? `promedio ${row.averageRating.toLocaleString('es')} ★` : 'sin promedio'}
          />
        </div>

        {period !== 'month' && (
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {period === 'day' ? 'Así va su bono de la semana' : 'Cómo se armó el bono'}
            </p>
            <div className="mt-1 divide-y divide-slate-100">
              <Component
                label="Volumen"
                detail={
                  period === 'day' ? 'Servicio acumulado de la semana' : `${formatCup(row.serviceTotal)} CUP de servicio`
                }
                value={worked || period === 'day' ? row.volumePct : null}
              />
              <Component
                label="Acciones"
                detail={period === 'day' ? 'Reseñas de la semana' : `${row.reviewCount} reseñas recibidas`}
                value={worked || period === 'day' ? row.actionsPct : null}
              />
              <Component
                label="Fiabilidad"
                detail={
                  period === 'day'
                    ? 'Entregas completadas de la semana'
                    : `${Math.round(row.completionRate * 100)}% de entregas completadas`
                }
                value={worked || period === 'day' ? row.reliabilityPct : null}
              />
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm font-semibold text-slate-900">Bono de la semana</p>
                <p className="text-sm font-bold tabular-nums text-slate-900">{row.bonusPct}%</p>
              </div>
            </div>
          </div>
        )}

        {(volumeHint || actionsHint) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">Para subir su bono</p>
            <ul className="mt-1 list-disc pl-5">
              {volumeHint && (
                <li>
                  Faltan {formatCup(volumeHint.missing)} CUP de servicio para sumar {volumeHint.gainPct}% más.
                </li>
              )}
              {actionsHint && (
                <li>
                  {actionsHint.missing === 1 ? 'Falta 1 reseña' : `Faltan ${actionsHint.missing} reseñas`} para
                  sumar {actionsHint.gainPct}% más.
                </li>
              )}
            </ul>
          </div>
        )}

        {!row.qualified && (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            {period === 'day'
              ? 'No clasificó: su bono de la semana va en 0%, así que el día no aporta.'
              : worked
                ? 'No clasificó: el volumen y las reseñas no compensan los puntos que restó la fiabilidad (o no llegó al primer tramo de volumen).'
                : 'No clasificó: no tuvo entregas completadas.'}
          </p>
        )}

        {period === 'month' && row.weeks && row.weeks.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-slate-900">Por semana</p>
            <table className="mt-1 w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-1 text-left font-medium">Semana</th>
                  <th className="py-1 text-right font-medium">Servicio</th>
                  <th className="py-1 text-right font-medium">Bono</th>
                  <th className="py-1 text-right font-medium">Gana</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {row.weeks.map((week) => (
                  <tr key={week.from}>
                    <td className="py-1.5 text-slate-700">
                      {formatDay(week.from)} – {formatDay(week.to)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-slate-700">{formatCup(week.serviceTotal)}</td>
                    <td className="py-1.5 text-right tabular-nums text-slate-700">{week.bonusPct}%</td>
                    <td className="py-1.5 text-right font-semibold tabular-nums text-slate-900">
                      {formatCup(week.bonusAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total && period === 'day' && (
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <Star className="h-3 w-3" aria-hidden />
            Los tramos del bono son semanales: el día no se evalúa por separado.
          </p>
        )}
      </div>
    </Modal>
  );
}
