import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { RetentionCohortDTO } from '@/lib/types';
import { useGetRetentionCohortsQuery } from './analyticsApi';

const MONTHS_OPTIONS = [3, 6, 12] as const;

// Escala secuencial de un solo tono (magnitud, no identidad) — misma rampa naranja de marca
// usada en el resto de la app para "más énfasis".
const LOW_COLOR = { r: 0xff, g: 0xf4, b: 0xf0 }; // --color-brand-50
const HIGH_COLOR = { r: 0xc9, g: 0x3d, b: 0x10 }; // --color-brand-700

function cellColor(percent: number): { background: string; textDark: boolean } {
  const t = Math.max(0, Math.min(1, percent / 100));
  const r = Math.round(LOW_COLOR.r + (HIGH_COLOR.r - LOW_COLOR.r) * t);
  const g = Math.round(LOW_COLOR.g + (HIGH_COLOR.g - LOW_COLOR.g) * t);
  const b = Math.round(LOW_COLOR.b + (HIGH_COLOR.b - LOW_COLOR.b) * t);
  // Luminancia relativa aproximada — decide si el texto va oscuro o blanco según el fondo.
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return { background: `rgb(${r}, ${g}, ${b})`, textDark: luminance > 0.6 };
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('es', { month: 'short', year: 'numeric' });
}

function RetentionCell({ value }: { value: number | null }) {
  if (value === null) {
    return <td className="px-2 py-2 text-center text-xs text-slate-300">—</td>;
  }
  const { background, textDark } = cellColor(value);
  return (
    <td className="px-1 py-1">
      <div
        className={clsx(
          'rounded-md px-2 py-1.5 text-center text-xs font-medium',
          textDark ? 'text-slate-900' : 'text-white',
        )}
        style={{ backgroundColor: background }}
      >
        {Math.round(value)}%
      </div>
    </td>
  );
}

export function RetentionCohortsTable() {
  const [months, setMonths] = useState<(typeof MONTHS_OPTIONS)[number]>(6);
  const { data, isLoading } = useGetRetentionCohortsQuery({ months });
  const cohorts: RetentionCohortDTO[] = useMemo(() => data?.data ?? [], [data]);

  const maxCols = useMemo(
    () => cohorts.reduce((max, cohort) => Math.max(max, cohort.retention.length), 0),
    [cohorts],
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Fidelización por cohortes</h2>
        <div className="flex w-fit gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {MONTHS_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMonths(option)}
              className={clsx(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                months === option ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {option}m
            </button>
          ))}
        </div>
      </div>
      <p className="mb-3 text-xs text-slate-400">
        De los clientes adquiridos en cada mes, qué % volvió a comprar en los meses siguientes.
      </p>

      {isLoading && <p className="text-slate-400">Cargando…</p>}

      {!isLoading && cohorts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-slate-500">Cohorte</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-slate-500">Clientes</th>
                {Array.from({ length: maxCols }, (_, i) => (
                  <th key={i} className="px-2 py-2 text-center text-xs font-medium text-slate-500">
                    Mes {i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((cohort) => (
                <tr key={cohort.cohortMonth}>
                  <td className="px-2 py-2 text-xs font-medium text-slate-700">
                    {formatMonthLabel(cohort.cohortMonth)}
                  </td>
                  <td className="px-2 py-2 text-right text-xs text-slate-500">{cohort.cohortSize}</td>
                  {Array.from({ length: maxCols }, (_, i) => (
                    <RetentionCell key={i} value={cohort.retention[i] ?? null} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
