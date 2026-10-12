import { useState } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Coins,
  Gift,
  ShoppingBag,
  Users,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { formatDate } from '@/lib/formatDate';
import type { DateRangePreset } from '@/lib/types';
import { useGetPointsOverviewQuery, useListPointsRedemptionsQuery } from './puntosApi';

type RangeTab = Exclude<DateRangePreset, 'custom'>;

const RANGE_TABS: { value: RangeTab; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: '6months', label: 'Semestre' },
  { value: 'year', label: 'Año' },
];

const TOP_CUSTOMERS_LIMIT = 10;
const REDEMPTIONS_PAGE_SIZE = 10;

function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function StatTile({
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

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-slate-900">{title}</h2>
      {description && <p className="mb-3 text-xs text-slate-400">{description}</p>}
      {children}
    </div>
  );
}

function BarRow({
  label,
  value,
  total,
  tone = 'brand',
}: {
  label: string;
  value: number;
  total: number;
  tone?: 'brand' | 'slate' | 'green';
}) {
  const width = percent(value, total);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="shrink-0 text-slate-500">
          <span className="font-semibold text-slate-900">{value}</span> · {width}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={clsx(
            'h-full rounded-full',
            tone === 'brand' && 'bg-brand-500',
            tone === 'green' && 'bg-green-500',
            tone === 'slate' && 'bg-slate-400',
          )}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function PuntosPage() {
  const [range, setRange] = useState<RangeTab>('month');
  const [redemptionsPage, setRedemptionsPage] = useState(1);

  const { data, isLoading, isError } = useGetPointsOverviewQuery({
    range,
    limit: TOP_CUSTOMERS_LIMIT,
  });
  const overview = data?.data;
  const bySourceTotal = overview ? overview.bySource.compras + overview.bySource.referidos : 0;

  const { data: redemptionsData, isLoading: isLoadingRedemptions } = useListPointsRedemptionsQuery({
    page: redemptionsPage,
    pageSize: REDEMPTIONS_PAGE_SIZE,
  });
  const redemptions = redemptionsData?.data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Puntos</h1>
        <p className="text-sm text-slate-500">
          Cuántos puntos de fidelización se han emitido y usado, de dónde vienen y quiénes tienen
          más saldo acumulado.
        </p>
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
      {isError && <p className="text-red-600">No se pudieron cargar las estadísticas de puntos.</p>}

      {overview && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon={ArrowUpCircle}
              label="Puntos emitidos"
              value={overview.issued.total.toLocaleString('es')}
              sublabel="en el período"
              highlight
            />
            <StatTile
              icon={ArrowDownCircle}
              label="Puntos retirados"
              value={overview.redeemed.total.toLocaleString('es')}
              sublabel="canjes y correcciones a la baja"
            />
            <StatTile
              icon={Coins}
              label="Variación neta"
              value={overview.net.toLocaleString('es')}
              sublabel="emitidos − retirados"
            />
            <StatTile
              icon={Wallet}
              label="Saldo pendiente"
              value={overview.outstanding.totalBalance.toLocaleString('es')}
              sublabel={`${overview.outstanding.customersWithBalance} cliente${overview.outstanding.customersWithBalance === 1 ? '' : 's'} con saldo`}
            />
          </div>

          <Card
            title="Puntos emitidos por fuente"
            description="De los puntos emitidos en el período, cuántos vienen de compras (pedido completado, bono de bienvenida y correcciones) y cuántos de referidos."
          >
            {bySourceTotal === 0 ? (
              <p className="flex h-16 items-center justify-center text-sm text-slate-400">
                No se emitieron puntos en este período.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <BarRow
                  label="Por compras"
                  value={overview.bySource.compras}
                  total={bySourceTotal}
                />
                <BarRow
                  label="Por referidos"
                  value={overview.bySource.referidos}
                  total={bySourceTotal}
                  tone="slate"
                />
              </div>
            )}
          </Card>

          <Card
            title="Clientes con más puntos"
            description="Saldo vigente de puntos, sin importar el período seleccionado arriba."
          >
            {overview.topCustomers.length === 0 ? (
              <p className="flex h-24 items-center justify-center text-sm text-slate-400">
                Todavía ningún cliente tiene saldo de puntos.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2 pr-2 font-medium">#</th>
                      <th className="px-2 py-2 font-medium">Cliente</th>
                      <th className="px-2 py-2 text-right font-medium">Puntos</th>
                      <th className="py-2 pl-2 font-medium">Último pedido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {overview.topCustomers.map((customer, index) => (
                      <tr key={customer.id} className="text-slate-700">
                        <td className="py-2 pr-2 text-slate-400">{index + 1}</td>
                        <td className="px-2 py-2">
                          <p className="font-medium text-slate-900">{customer.name}</p>
                          <p className="text-xs text-slate-400">{customer.phone}</p>
                        </td>
                        <td className="px-2 py-2 text-right font-semibold text-slate-900">
                          {customer.pointsBalance.toLocaleString('es')}
                        </td>
                        <td className="py-2 pl-2 text-slate-500">
                          {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Detalle por tipo de movimiento" description="Neto del período, tal como queda en el libro mayor de puntos.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {overview.byType.map((row) => (
                <StatTile
                  key={row.type}
                  icon={typeIcon(row.type)}
                  label={typeLabel(row.type)}
                  value={row.points.toLocaleString('es')}
                  sublabel={`${row.count} movimiento${row.count === 1 ? '' : 's'}`}
                />
              ))}
            </div>
          </Card>
        </>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Clientes que ya canjearon puntos</h2>
          <p className="text-xs text-slate-400">
            Toda la historia, sin importar el rango seleccionado arriba.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Canjeó</th>
                <th className="px-4 py-3 text-right font-medium">Puntos</th>
                <th className="px-4 py-3 text-right font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Pedido</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingRedemptions && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Cargando…
                  </td>
                </tr>
              )}
              {!isLoadingRedemptions && redemptions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Todavía nadie ha canjeado sus puntos.
                  </td>
                </tr>
              )}
              {redemptions.map((redemption) => (
                <tr key={redemption.id} className="text-slate-700">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{redemption.customerName}</p>
                    <p className="text-xs text-slate-400">{redemption.customerPhone}</p>
                  </td>
                  <td className="px-4 py-3">{redemption.rewardName}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {redemption.pointsCost.toLocaleString('es')}
                  </td>
                  <td className="px-4 py-3 text-right">{redemption.moneyValue.toLocaleString('es')} CUP</td>
                  <td className="px-4 py-3">#{redemption.orderNumber}</td>
                  <td className="px-4 py-3">{formatDate(redemption.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={redemption.status === 'APPLIED' ? 'green' : 'slate'}>
                      {redemption.status === 'APPLIED' ? 'Aplicado' : 'Devuelto'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {redemptionsData && <Pagination meta={redemptionsData.meta} onPageChange={setRedemptionsPage} />}
        </div>
      </div>
    </div>
  );
}

function typeLabel(type: string): string {
  switch (type) {
    case 'ORDER_COMPLETED':
      return 'Pedidos completados';
    case 'ORDER_ADJUSTMENT':
      return 'Correcciones';
    case 'FIRST_ORDER_BONUS':
      return 'Bono de bienvenida';
    case 'REDEMPTION':
      return 'Canjes';
    case 'REDEMPTION_REFUND':
      return 'Devoluciones de canje';
    case 'REFERRAL_REWARD':
      return 'Referidos';
    default:
      return type;
  }
}

function typeIcon(type: string): LucideIcon {
  switch (type) {
    case 'ORDER_COMPLETED':
    case 'ORDER_ADJUSTMENT':
      return ShoppingBag;
    case 'FIRST_ORDER_BONUS':
      return Gift;
    case 'REDEMPTION':
    case 'REDEMPTION_REFUND':
      return ArrowDownCircle;
    case 'REFERRAL_REWARD':
      return Users;
    default:
      return Coins;
  }
}
