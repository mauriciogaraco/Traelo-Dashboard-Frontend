import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import {
  Bell,
  Bike,
  Heart,
  PackageCheck,
  Search,
  ShieldCheck,
  Smartphone,
  Timer,
  UserPlus,
  UserRound,
  UserX,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { formatDate } from '@/lib/formatDate';
import type { AppCustomerListFilter, DateRangePreset, Role } from '@/lib/types';
import { useGetAppCustomersOverviewQuery, useListAppCustomersQuery } from './appCustomersApi';
import { RegistrationsBarChart } from './RegistrationsBarChart';

type RangeTab = Exclude<DateRangePreset, 'custom'>;

const RANGE_TABS: { value: RangeTab; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: '6months', label: 'Semestre' },
  { value: 'year', label: 'Año' },
];

const LIST_FILTERS: { value: AppCustomerListFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'with-order', label: 'Con pedido' },
  { value: 'without-order', label: 'Sin pedido todavía' },
  { value: 'excluded', label: 'Excluidas (no cuentan)' },
  { value: 'with-push', label: 'Con notificaciones' },
];

const PAGE_SIZE = 10;

function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function formatHours(hours: number | null): string {
  if (hours === null) return '—';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) {
    const whole = Math.floor(hours);
    const minutes = Math.round((hours - whole) * 60);
    return minutes > 0 ? `${whole} h ${minutes} min` : `${whole} h`;
  }
  return `${(hours / 24).toFixed(1)} días`;
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
  detail,
}: {
  label: string;
  value: number;
  total: number;
  tone?: 'brand' | 'slate' | 'green';
  detail?: string;
}) {
  const width = percent(value, total);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="shrink-0 text-slate-500">
          <span className="font-semibold text-slate-900">{value}</span>
          {detail ?? ` · ${width}%`}
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

export function AppCustomersPage() {
  const [range, setRange] = useState<RangeTab>('week');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<AppCustomerListFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  const { data: overviewData, isLoading, isError } = useGetAppCustomersOverviewQuery({ range });
  const overview = overviewData?.data;

  const { data: listData, isLoading: isLoadingList } = useListAppCustomersQuery({
    page,
    pageSize: PAGE_SIZE,
    filter,
    search: search || undefined,
  });
  const rows = listData?.data ?? [];

  const staffByRole = (role: Role) => overview?.users.staff.find((s) => s.role === role);
  const deliverers = staffByRole('DELIVERER');
  const appOrders = overview
    ? overview.orders.appRegistered +
      overview.orders.appGuest +
      overview.orders.webRegistered +
      overview.orders.webGuest
    : 0;
  const guestOrders = overview ? overview.orders.appGuest + overview.orders.webGuest : 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Clientes de la app</h1>
        <p className="text-sm text-slate-500">
          Cuentas registradas en la app y la web, cuántas llegan a pedir y cuántos piden sin
          registrarse.
        </p>
      </div>

      {isLoading && <p className="text-slate-400">Cargando…</p>}
      {isError && <p className="text-red-600">No se pudieron cargar las estadísticas.</p>}

      {overview && (
        <>
          <Card
            title="Usuarios por tipo"
            description={`Personal y clientes de la app. Los clientes son cuentas aparte del personal; solo cuentan las que tienen contraseña y se crearon desde el ${formatDate(overview.customers.countedSince)}, cuando se abrió el registro.`}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <StatTile
                icon={Smartphone}
                label="Clientes de la app"
                value={overview.users.customers}
                sublabel={
                  overview.customers.excluded > 0
                    ? `+${overview.customers.excluded} cuentas anteriores o de prueba, no incluidas`
                    : 'cuentas con contraseña'
                }
                highlight
              />
              <StatTile
                icon={Bike}
                label="Mensajeros"
                value={deliverers?.active ?? 0}
                sublabel={`${deliverers?.inactive ?? 0} inactivos · ${overview.users.delivererProfiles} perfiles`}
              />
              <StatTile
                icon={ShieldCheck}
                label="Dueños y administradores"
                value={(staffByRole('OWNER')?.active ?? 0) + (staffByRole('ADMIN')?.active ?? 0)}
                sublabel={`${staffByRole('OWNER')?.active ?? 0} dueños · ${staffByRole('ADMIN')?.active ?? 0} admins`}
              />
              <StatTile
                icon={UserRound}
                label="Empleados"
                value={staffByRole('EMPLOYEE')?.active ?? 0}
              />
              <StatTile
                icon={UserRound}
                label="Dueños de negocio"
                value={staffByRole('BUSINESS_OWNER')?.active ?? 0}
              />
            </div>
          </Card>

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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon={UserPlus}
              label="Registros en el período"
              value={overview.period.registered}
              sublabel={`${overview.customers.total} en total`}
              highlight
            />
            <StatTile
              icon={PackageCheck}
              label="Hicieron su primer pedido"
              value={overview.period.funnel.withOrder}
              sublabel={`${percent(overview.period.funnel.withOrder, overview.period.funnel.registered)}% de los registrados`}
            />
            <StatTile
              icon={PackageCheck}
              label="Con pedido completado"
              value={overview.period.funnel.withCompletedOrder}
              sublabel={`${percent(overview.period.funnel.withCompletedOrder, overview.period.funnel.registered)}% de los registrados`}
            />
            <StatTile
              icon={Timer}
              label="Tiempo al primer pedido"
              value={formatHours(overview.period.medianHoursToFirstOrder)}
              sublabel={`mediana · promedio ${formatHours(overview.period.avgHoursToFirstOrder)}`}
            />
          </div>

          <Card
            title="Registros en el tiempo"
            description={
              range === 'today'
                ? 'Elegí Semana, Mes, Semestre o Año para ver la evolución.'
                : range === '6months'
                  ? 'Cuentas nuevas por semana.'
                  : range === 'year'
                    ? 'Cuentas nuevas por mes.'
                    : 'Cuentas nuevas por día.'
            }
          >
            {range === 'today' ? (
              <p className="flex h-24 items-center justify-center text-sm text-slate-400">
                Hoy: {overview.period.registered} registro{overview.period.registered === 1 ? '' : 's'}.
              </p>
            ) : (
              <RegistrationsBarChart
                data={overview.period.series}
                granularity={overview.period.granularity}
              />
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card
              title="Embudo de los registrados del período"
              description="De las cuentas creadas en este período, cuántas ya pidieron (sin contar cancelados)."
            >
              <div className="flex flex-col gap-4">
                <BarRow
                  label="Se registraron"
                  value={overview.period.funnel.registered}
                  total={overview.period.funnel.registered}
                  tone="slate"
                  detail=""
                />
                <BarRow
                  label="Hicieron un pedido"
                  value={overview.period.funnel.withOrder}
                  total={overview.period.funnel.registered}
                />
                <BarRow
                  label="Tienen un pedido completado"
                  value={overview.period.funnel.withCompletedOrder}
                  total={overview.period.funnel.registered}
                  tone="green"
                />
              </div>
            </Card>

            <Card
              title="Pedidos del período por origen"
              description="Sin contar cancelados. Un pedido de invitado es el de quien compra sin crear cuenta."
            >
              <div className="flex flex-col gap-4">
                <BarRow
                  label="App · con cuenta"
                  value={overview.orders.appRegistered}
                  total={overview.orders.total}
                />
                <BarRow
                  label="App · sin cuenta (invitado)"
                  value={overview.orders.appGuest}
                  total={overview.orders.total}
                  tone="slate"
                />
                <BarRow
                  label="Web · con cuenta"
                  value={overview.orders.webRegistered}
                  total={overview.orders.total}
                />
                <BarRow
                  label="Web · sin cuenta (invitado)"
                  value={overview.orders.webGuest}
                  total={overview.orders.total}
                  tone="slate"
                />
                {overview.orders.telegram > 0 && (
                  <BarRow
                    label="Telegram"
                    value={overview.orders.telegram}
                    total={overview.orders.total}
                    tone="slate"
                  />
                )}
                <BarRow
                  label="Cargados por el staff (manuales)"
                  value={overview.orders.manual}
                  total={overview.orders.total}
                  tone="green"
                />
              </div>
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                {appOrders > 0 ? (
                  <>
                    De los {appOrders} pedidos de la app y la web, {guestOrders} (
                    {percent(guestOrders, appOrders)}%) los hicieron personas sin cuenta:{' '}
                    {overview.orders.guestPeople} persona{overview.orders.guestPeople === 1 ? '' : 's'}{' '}
                    distinta{overview.orders.guestPeople === 1 ? '' : 's'}, de las que{' '}
                    {overview.orders.guestPeopleWithAccount} ya tiene
                    {overview.orders.guestPeopleWithAccount === 1 ? '' : 'n'} cuenta hoy.
                  </>
                ) : (
                  'No hay pedidos de la app o la web en este período.'
                )}
              </p>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card
              title="Cómo llegan los clientes"
              description="De las cuentas creadas en el período: las que se registraron con el código de otro cliente y las orgánicas, sin código. El sistema no distingue si entraron por enlace o escribiendo el código."
            >
              <div className="flex flex-col gap-4">
                <BarRow
                  label="Con código de referido"
                  value={overview.referrals.period.referred}
                  total={overview.period.registered}
                />
                <BarRow
                  label="Orgánicos (sin código)"
                  value={overview.referrals.period.organic}
                  total={overview.period.registered}
                  tone="slate"
                />
              </div>
              <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <p>
                  Referidos del período que ya completaron su primer pedido:{' '}
                  <span className="font-semibold text-slate-900">
                    {overview.referrals.period.converted}
                  </span>{' '}
                  de {overview.referrals.period.referred}.
                </p>
                <p>
                  Toda la historia: {overview.referrals.allTime.referred} con código de referido y{' '}
                  {overview.referrals.allTime.organic} orgánicos.{' '}
                  {overview.referrals.allTime.withReferralCode}{' '}
                  {overview.referrals.allTime.withReferralCode === 1
                    ? 'cliente ya generó'
                    : 'clientes ya generaron'}{' '}
                  su código para invitar.
                </p>
              </div>
            </Card>

            <Card
              title="Top referidores"
              description="Quiénes trajeron más clientes en el período. “Completaron” cuenta los referidos que ya hicieron su primer pedido."
            >
              {overview.referrals.top.length === 0 ? (
                <p className="flex h-24 items-center justify-center text-sm text-slate-400">
                  Todavía nadie trajo clientes con su código en este período.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="py-2 pr-2 font-medium">#</th>
                        <th className="px-2 py-2 font-medium">Cliente</th>
                        <th className="px-2 py-2 text-right font-medium">Referidos</th>
                        <th className="px-2 py-2 text-right font-medium">Completaron</th>
                        <th className="py-2 pl-2 font-medium">Último</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {overview.referrals.top.map((referrer, index) => (
                        <tr key={referrer.id} className="text-slate-700">
                          <td className="py-2 pr-2 text-slate-400">{index + 1}</td>
                          <td className="px-2 py-2">
                            <p className="font-medium text-slate-900">{referrer.name}</p>
                            <p className="text-xs text-slate-400">{referrer.phone}</p>
                          </td>
                          <td className="px-2 py-2 text-right font-semibold text-slate-900">
                            {referrer.referrals}
                          </td>
                          <td className="px-2 py-2 text-right">{referrer.converted}</td>
                          <td className="py-2 pl-2 text-slate-500">
                            {formatDate(referrer.lastReferralAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <Card
            title="Clientes registrados — toda la historia"
            description="Qué tan completo es el perfil de las cuentas que cuentan. Sirve para saber a cuántos se puede llegar con notificaciones."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                icon={UserRound}
                label="Dejaron su correo"
                value={overview.customers.withEmail}
                sublabel={`${percent(overview.customers.withEmail, overview.customers.total)}% del total`}
              />
              <StatTile
                icon={UserX}
                label="Cuentas excluidas"
                value={overview.customers.excluded}
                sublabel="anteriores al registro o sin contraseña, no cuentan"
              />
              <StatTile
                icon={Bell}
                label="Con notificaciones"
                value={overview.customers.withPush}
                sublabel={`${percent(overview.customers.withPush, overview.customers.total)}% del total`}
              />
              <StatTile
                icon={Heart}
                label="Con favoritos"
                value={overview.customers.withFavorites}
                sublabel={`${overview.customers.referred} llegaron por referido`}
              />
            </div>
          </Card>
        </>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Listado de clientes</h2>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nombre, teléfono o correo…"
              className="w-72 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as AppCustomerListFilter)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {LIST_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Teléfono</th>
                <th className="px-4 py-3 font-medium">Correo</th>
                <th className="px-4 py-3 font-medium">Registro</th>
                <th className="px-4 py-3 font-medium">Cuenta</th>
                <th className="px-4 py-3 font-medium">Pedidos</th>
                <th className="px-4 py-3 font-medium">Último pedido</th>
                <th className="px-4 py-3 font-medium">Puntos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingList && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Cargando…
                  </td>
                </tr>
              )}
              {!isLoadingList && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No hay clientes que coincidan con los filtros.
                  </td>
                </tr>
              )}
              {rows.map((customer) => (
                <tr key={customer.id} className="text-slate-700">
                  <td className="px-4 py-3 font-medium text-slate-900">{customer.name}</td>
                  <td className="px-4 py-3">{customer.phone}</td>
                  <td className="px-4 py-3">{customer.email ?? '—'}</td>
                  <td className="px-4 py-3">{formatDate(customer.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={customer.hasPassword ? 'green' : 'slate'}>
                        {customer.hasPassword ? 'Con contraseña' : 'Sin contraseña'}
                      </Badge>
                      {customer.hasPush && <Badge tone="brand">Notificaciones</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">{customer.orderCount}</td>
                  <td className="px-4 py-3">
                    {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : '—'}
                  </td>
                  <td className="px-4 py-3">{customer.pointsBalance}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {listData && <Pagination meta={listData.meta} onPageChange={setPage} />}
        </div>
      </div>
    </div>
  );
}
