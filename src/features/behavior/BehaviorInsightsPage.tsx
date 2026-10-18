import { useState } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Eye, Search, ShoppingCart } from 'lucide-react';
import { formatDateTime } from '@/lib/formatDate';
import type { BehaviorInsightsDTO } from '@/lib/types';
import { useGetBehaviorInsightsQuery } from './behaviorApi';

type Range = 'today' | 'week' | 'month';

const RANGES: { value: Range; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
];

const percent = (value: number | null) => (value === null ? '—' : `${Math.round(value * 1000) / 10}%`);

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-8 text-center text-sm text-slate-400">{children}</p>;
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs font-medium text-slate-500">
            {head.map((label, index) => (
              <th key={label} className={clsx('px-4 py-2.5', index > 0 && 'text-right')}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

const num = 'px-4 py-2.5 text-right tabular-nums text-slate-700';

function PromoSection({ promo }: { promo: NonNullable<BehaviorInsightsDTO['promo']> }) {
  return (
    <Section
      title="Promo: primera mensajería gratis"
      description="San Antonio de los Baños. Personas distintas (visitante anónimo); los pedidos son el dato exacto."
    >
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-5">
        <Stat label="Vieron la promo" value={promo.viewers} hint={`${promo.views} visitas a la pantalla`} />
        <Stat label="Pulsaron «Pide ahora»" value={promo.clickers} />
        <Stat label="Llegaron al Home con el código" value={promo.landed} />
        <Stat label="Pedidos con el código" value={promo.orders} hint="no cancelados" />
        <Stat label="Pidieron / vieron" value={percent(promo.conversion)} />
      </div>
    </Section>
  );
}

function Results({ data }: { data: BehaviorInsightsDTO }) {
  const { searches, businesses, products, promo } = data;
  return (
    <>
      {promo && <PromoSection promo={promo} />}

      <Section title="Búsquedas" description="Lo que escribieron en el buscador (no se guarda si parecía un teléfono o un correo).">
        <div className="grid grid-cols-3 gap-3 p-4">
          <Stat label="Búsquedas" value={searches.total} />
          <Stat label="Personas que buscaron" value={searches.visitors} />
          <Stat label="Sin resultados" value={searches.withoutResults} hint="buscaron y no encontraron" />
        </div>
        <div className="grid gap-px border-t border-slate-100 bg-slate-100 lg:grid-cols-2">
          <div className="bg-white">
            <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Lo más buscado</p>
            {searches.top.length === 0 ? (
              <Empty>Todavía no hay búsquedas en este período.</Empty>
            ) : (
              <Table head={['Texto', 'Veces', 'Personas', 'Sin resultado']}>
                {searches.top.map((row) => (
                  <tr key={row.query}>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{row.query}</td>
                    <td className={num}>{row.searches}</td>
                    <td className={num}>{row.visitors}</td>
                    <td className={num}>{row.withoutResults}</td>
                  </tr>
                ))}
              </Table>
            )}
          </div>
          <div className="bg-white">
            <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Buscaron y no encontraron
            </p>
            {searches.notFound.length === 0 ? (
              <Empty>Nada sin resultado en este período.</Empty>
            ) : (
              <Table head={['Texto', 'Veces', 'Personas']}>
                {searches.notFound.map((row) => (
                  <tr key={row.query}>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{row.query}</td>
                    <td className={num}>{row.withoutResults}</td>
                    <td className={num}>{row.visitors}</td>
                  </tr>
                ))}
              </Table>
            )}
          </div>
        </div>
      </Section>

      <Section title="Negocios más abiertos" description="Cuántas veces abrieron la página del negocio, directo o desde una búsqueda.">
        {businesses.length === 0 ? (
          <Empty>Todavía no hay visitas a negocios en este período.</Empty>
        ) : (
          <Table head={['Negocio', 'Ciudad', 'Aperturas', 'Desde búsqueda', 'Personas']}>
            {businesses.map((row) => (
              <tr key={row.businessId}>
                <td className="px-4 py-2.5 font-medium text-slate-900">{row.name}</td>
                <td className="px-4 py-2.5 text-right text-slate-500">{row.cityName}</td>
                <td className={num}>{row.views}</td>
                <td className={num}>{row.searchClicks}</td>
                <td className={num}>{row.visitors}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Productos" description="Los que abrieron, añadieron al carrito o abrieron desde una búsqueda.">
        {products.length === 0 ? (
          <Empty>Todavía no hay actividad en productos en este período.</Empty>
        ) : (
          <Table head={['Producto', 'Negocio', 'Abiertos', 'Al carrito', 'Desde búsqueda', 'Personas']}>
            {products.map((row) => (
              <tr key={row.productId}>
                <td className="px-4 py-2.5 font-medium text-slate-900">{row.name}</td>
                <td className="px-4 py-2.5 text-right text-slate-500">{row.businessName}</td>
                <td className={num}>{row.views}</td>
                <td className={num}>{row.addToCart}</td>
                <td className={num}>{row.searchClicks}</td>
                <td className={num}>{row.visitors}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </>
  );
}

/**
 * Qué buscan y qué abren en la web, separado por ciudad: el selector de ciudad del encabezado acota todo
 * (búsquedas, negocios, productos y la promo de mensajería gratis, que solo aparece en San Antonio).
 */
export function BehaviorInsightsPage() {
  const [range, setRange] = useState<Range>('week');
  const { data, isLoading, isFetching, isError } = useGetBehaviorInsightsQuery({ range, limit: 10 });
  const report = data?.data;

  const scope =
    report && report.cities.length > 0 ? report.cities.map((city) => city.name).join(' y ') : 'todas las ciudades';

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
          <Eye className="h-5 w-5 text-slate-400" />
          Comportamiento
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Qué buscan y qué abren o añaden al carrito en la web: <span className="font-medium text-slate-700">{scope}</span>.
          Se cuenta por visitante anónimo; quien desactiva la analítica o usa bloqueadores no aparece.
        </p>
      </div>

      <div className="flex w-fit gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {RANGES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setRange(option.value)}
            className={clsx(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              range === option.value ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {report && (
        <p className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span>
            Del {formatDateTime(report.from)} al {formatDateTime(report.to)}
          </span>
          {isFetching && <span>· actualizando…</span>}
        </p>
      )}

      {isLoading && <p className="rounded-xl border border-slate-200 bg-white p-5 text-slate-400">Cargando…</p>}

      {isError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <Search className="h-4 w-4" />
          No se pudo cargar el resumen. Inténtalo de nuevo en un momento.
        </div>
      )}

      {report && (
        <div className={clsx('flex flex-col gap-5 transition-opacity', isFetching && 'opacity-60')}>
          <Results data={report} />
        </div>
      )}

      {report === undefined && !isLoading && !isError && (
        <div className="flex flex-col items-center gap-2 p-10 text-center text-slate-400">
          <ShoppingCart className="h-8 w-8" />
          <p>Sin datos.</p>
        </div>
      )}
    </div>
  );
}
