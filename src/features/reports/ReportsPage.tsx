import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Bike, PackageCheck, Percent, ShoppingBag, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import type { CustomerSortBy, DateRangePreset, TopBusinessDTO, TopDelivererDTO } from '@/lib/types';
import { BusinessDetailModal } from './BusinessDetailModal';
import { DelivererDetailModal } from './DelivererDetailModal';
import { OrderCustomerSearch } from './OrderCustomerSearch';
import {
  useGetSalesReportQuery,
  useGetTopBusinessesQuery,
  useGetTopCustomersQuery,
  useGetTopDeliverersQuery,
  useGetTopProductsQuery,
  useListReportBusinessesQuery,
  useListReportDeliverersQuery,
} from './reportsApi';

type RangeTab = Exclude<DateRangePreset, 'custom'>;

const RANGE_TABS: { value: RangeTab; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: '6months', label: 'Semestre' },
  { value: 'year', label: 'Año' },
];

const TOP_LIMIT = 10;
const PAGE_SIZE = 10;

function formatCUP(value: number): string {
  return `${value.toLocaleString('es')} CUP`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
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
    </div>
  );
}

function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: 'top' | 'all';
  onChange: (mode: 'top' | 'all') => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
      <button
        type="button"
        onClick={() => onChange('top')}
        className={clsx(
          'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
          mode === 'top' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
        )}
      >
        Top 10
      </button>
      <button
        type="button"
        onClick={() => onChange('all')}
        className={clsx(
          'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
          mode === 'all' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
        )}
      >
        Todos
      </button>
    </div>
  );
}

function TopBusinessesSection({
  range,
  onViewDetail,
}: {
  range: RangeTab;
  onViewDetail: (business: TopBusinessDTO) => void;
}) {
  const [mode, setMode] = useState<'top' | 'all'>('top');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(input.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timeout);
  }, [input]);

  useEffect(() => {
    setPage(1);
  }, [range, mode]);

  const topQuery = useGetTopBusinessesQuery({ range, limit: TOP_LIMIT }, { skip: mode !== 'top' });
  const allQuery = useListReportBusinessesQuery(
    { range, page, pageSize: PAGE_SIZE, search: search || undefined },
    { skip: mode !== 'all' },
  );

  const businesses = mode === 'top' ? topQuery.data?.data ?? [] : allQuery.data?.data ?? [];
  const isLoading = mode === 'top' ? topQuery.isLoading : allQuery.isLoading;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Negocios</h2>
        <ViewModeToggle mode={mode} onChange={setMode} />
      </div>
      {mode === 'all' && (
        <div className="border-b border-slate-200 px-4 py-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Buscar negocio…"
            className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      )}
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Negocio</th>
            <th className="px-4 py-3 font-medium">Ventas</th>
            <th className="px-4 py-3 font-medium">Comisión</th>
            <th className="px-4 py-3 font-medium">Pedidos</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                Cargando…
              </td>
            </tr>
          )}
          {!isLoading && businesses.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                Sin datos en este periodo.
              </td>
            </tr>
          )}
          {!isLoading &&
            businesses.map((business) => (
              <tr key={business.businessId} className="text-slate-700">
                <td className="px-4 py-3 font-medium text-slate-900">{business.businessName}</td>
                <td className="px-4 py-3">{formatCUP(business.totalSales)}</td>
                <td className="px-4 py-3">{formatCUP(business.totalCommission)}</td>
                <td className="px-4 py-3">{business.orderCount}</td>
                <td className="px-4 py-3 text-right">
                  <Button type="button" variant="ghost" onClick={() => onViewDetail(business)}>
                    Ver detalles
                  </Button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      {mode === 'all' && allQuery.data && (
        <Pagination meta={allQuery.data.meta} onPageChange={setPage} />
      )}
    </div>
  );
}

function TopDeliverersSection({
  range,
  onViewDetail,
}: {
  range: RangeTab;
  onViewDetail: (deliverer: TopDelivererDTO) => void;
}) {
  const [mode, setMode] = useState<'top' | 'all'>('top');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(input.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timeout);
  }, [input]);

  useEffect(() => {
    setPage(1);
  }, [range, mode]);

  const topQuery = useGetTopDeliverersQuery({ range, limit: TOP_LIMIT }, { skip: mode !== 'top' });
  const allQuery = useListReportDeliverersQuery(
    { range, page, pageSize: PAGE_SIZE, search: search || undefined },
    { skip: mode !== 'all' },
  );

  const deliverers = mode === 'top' ? topQuery.data?.data ?? [] : allQuery.data?.data ?? [];
  const isLoading = mode === 'top' ? topQuery.isLoading : allQuery.isLoading;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Mensajeros</h2>
        <ViewModeToggle mode={mode} onChange={setMode} />
      </div>
      {mode === 'all' && (
        <div className="border-b border-slate-200 px-4 py-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Buscar mensajero…"
            className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      )}
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Mensajero</th>
            <th className="px-4 py-3 font-medium">Entregas</th>
            <th className="px-4 py-3 font-medium">Ganancias</th>
            <th className="px-4 py-3 font-medium">Servicio Tráelo</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                Cargando…
              </td>
            </tr>
          )}
          {!isLoading && deliverers.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                Sin datos en este periodo.
              </td>
            </tr>
          )}
          {!isLoading &&
            deliverers.map((deliverer) => (
              <tr key={deliverer.delivererId} className="text-slate-700">
                <td className="px-4 py-3 font-medium text-slate-900">{deliverer.delivererName}</td>
                <td className="px-4 py-3">{deliverer.deliveryCount}</td>
                <td className="px-4 py-3">{formatCUP(deliverer.totalEarnings)}</td>
                <td className="px-4 py-3">{formatCUP(deliverer.platformFeeCollected)}</td>
                <td className="px-4 py-3 text-right">
                  <Button type="button" variant="ghost" onClick={() => onViewDetail(deliverer)}>
                    Ver detalles
                  </Button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      {mode === 'all' && allQuery.data && (
        <Pagination meta={allQuery.data.meta} onPageChange={setPage} />
      )}
    </div>
  );
}

const TOP_PRODUCTS_LIMIT = 20;

function TopProductsSection({ range }: { range: RangeTab }) {
  const { data, isLoading } = useGetTopProductsQuery({ range, limit: TOP_PRODUCTS_LIMIT });
  const products = data?.data ?? [];

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Productos más vendidos — top {TOP_PRODUCTS_LIMIT}
        </h2>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Producto</th>
            <th className="px-4 py-3 font-medium">Negocio</th>
            <th className="px-4 py-3 font-medium">Unidades</th>
            <th className="px-4 py-3 font-medium">Ventas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                Cargando…
              </td>
            </tr>
          )}
          {!isLoading && products.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                Sin datos en este periodo.
              </td>
            </tr>
          )}
          {!isLoading &&
            products.map((product) => (
              <tr
                key={`${product.businessId}-${product.productId ?? ''}-${product.productName}`}
                className="text-slate-700"
              >
                <td className="px-4 py-3 font-medium text-slate-900">{product.productName}</td>
                <td className="px-4 py-3">{product.businessName}</td>
                <td className="px-4 py-3">{product.quantity}</td>
                <td className="px-4 py-3">{formatCUP(product.totalSales)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

const CUSTOMER_SORT_TABS: { value: CustomerSortBy; label: string }[] = [
  { value: 'orderCount', label: 'Más pedidos' },
  { value: 'totalSpent', label: 'Más dinero' },
  { value: 'traeloContribution', label: 'Más aporte a Tráelo' },
];

const CUSTOMERS_LIMIT = 20;

function TopCustomersSection({ range }: { range: RangeTab }) {
  const [sortBy, setSortBy] = useState<CustomerSortBy>('orderCount');
  const { data, isLoading } = useGetTopCustomersQuery({ range, sortBy, limit: CUSTOMERS_LIMIT });
  const customers = data?.data ?? [];

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Clientes recurrentes — top {CUSTOMERS_LIMIT}
        </h2>
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {CUSTOMER_SORT_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSortBy(tab.value)}
              className={clsx(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                sortBy === tab.value ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Teléfono</th>
            <th className="px-4 py-3 font-medium">Pedidos</th>
            <th className="px-4 py-3 font-medium">Total gastado</th>
            <th className="px-4 py-3 font-medium">Aporte a Tráelo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                Cargando…
              </td>
            </tr>
          )}
          {!isLoading && customers.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                Sin clientes recurrentes (2+ pedidos) en este periodo.
              </td>
            </tr>
          )}
          {!isLoading &&
            customers.map((customer) => (
              <tr key={customer.customerPhone} className="text-slate-700">
                <td className="px-4 py-3 font-medium text-slate-900">{customer.customerName}</td>
                <td className="px-4 py-3">{customer.customerPhone}</td>
                <td className="px-4 py-3">{customer.orderCount}</td>
                <td className="px-4 py-3">{formatCUP(customer.totalSpent)}</td>
                <td className="px-4 py-3">{formatCUP(customer.traeloContributionTotal)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportsPage() {
  const [range, setRange] = useState<RangeTab>('today');
  const [businessDetail, setBusinessDetail] = useState<TopBusinessDTO | null>(null);
  const [delivererDetail, setDelivererDetail] = useState<TopDelivererDTO | null>(null);

  const { data: salesData, isLoading: isSalesLoading } = useGetSalesReportQuery({ range });
  const sales = salesData?.data;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-slate-900">Reportes</h1>

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

      {isSalesLoading && <p className="text-slate-400">Cargando…</p>}

      {sales && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={ShoppingBag} label="Ventas de negocios" value={formatCUP(sales.businessSalesGross)} />
          <StatCard
            icon={Wallet}
            label="Servicio Tráelo cobrado"
            value={formatCUP(sales.platformFeeRevenue)}
            highlight
          />
          <StatCard icon={Bike} label="Mensajería" value={formatCUP(sales.deliveryFeeGross)} />
          <StatCard
            icon={PackageCheck}
            label="Pedidos completados"
            value={`${sales.completedOrders} / ${sales.totalOrders}`}
          />
          <StatCard icon={Percent} label="Ganancia total Tráelo" value={formatCUP(sales.traeloTotalRevenue)} />
          <StatCard
            icon={Bike}
            label="Mensajería — parte del mensajero"
            value={formatCUP(sales.delivererShareTotal)}
          />
          <StatCard
            icon={Bike}
            label="Mensajería — parte de Tráelo"
            value={formatCUP(sales.traeloDeliveryShareTotal)}
          />
          <StatCard icon={ShoppingBag} label="Ticket promedio" value={formatCUP(sales.averageTicket)} />
        </div>
      )}

      <OrderCustomerSearch />

      <div className="grid gap-4 lg:grid-cols-2">
        <TopBusinessesSection range={range} onViewDetail={setBusinessDetail} />
        <TopDeliverersSection range={range} onViewDetail={setDelivererDetail} />
      </div>

      <TopProductsSection range={range} />

      <TopCustomersSection range={range} />

      {businessDetail && (
        <BusinessDetailModal
          businessId={businessDetail.businessId}
          businessName={businessDetail.businessName}
          range={range}
          onClose={() => setBusinessDetail(null)}
        />
      )}

      {delivererDetail && (
        <DelivererDetailModal
          delivererId={delivererDetail.delivererId}
          delivererName={delivererDetail.delivererName}
          range={range}
          onClose={() => setDelivererDetail(null)}
        />
      )}
    </div>
  );
}
