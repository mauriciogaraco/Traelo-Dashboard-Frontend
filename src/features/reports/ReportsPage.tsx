import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Bike, Download, PackageCheck, Percent, ShoppingBag, Wallet, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useListBusinessesQuery } from '@/features/businesses/businessesApi';
import { exportReportPdf, type PdfColumn } from '@/lib/pdfExport';
import type {
  CustomerReportDTO,
  CustomerSortBy,
  DateRangePreset,
  TopBusinessDTO,
  TopDelivererDTO,
  TopProductDTO,
} from '@/lib/types';
import { BusinessDetailModal } from './BusinessDetailModal';
import { DelivererDetailModal } from './DelivererDetailModal';
import { OrderCustomerSearch } from './OrderCustomerSearch';
import {
  useGetSalesReportQuery,
  useGetTopBusinessesQuery,
  useGetTopCustomersQuery,
  useGetTopDeliverersQuery,
  useGetTopProductsQuery,
  useLazyListReportBusinessesQuery,
  useLazyListReportDeliverersQuery,
  useListReportBusinessesQuery,
  useListReportDeliverersQuery,
  type ReportsRangeParams,
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

// Se ancla al mediodía UTC en vez de medianoche: la fecha del <input type="date"> es un día
// calendario sin huso horario, y medianoche UTC de ese día cae la tarde/noche anterior en
// La Habana (UTC-5) — resolveDateRange calcularía el día de La Habana equivocado. Mediodía UTC
// cae siempre dentro del mismo día calendario en La Habana, sin importar el offset exacto.
function toHavanaSafeInstant(date: string): string {
  return `${date}T12:00:00.000Z`;
}

function filterToParams(filter: { range: RangeTab } | { date: string }): ReportsRangeParams {
  if ('date' in filter) {
    const instant = toHavanaSafeInstant(filter.date);
    return { range: 'custom', from: instant, to: instant };
  }
  return { range: filter.range };
}

function formatCUP(value: number): string {
  return `${value.toLocaleString('es')} CUP`;
}

// Puro manejo de string: la fecha del <input type="date"> ya es un día calendario, no hace
// falta pasar por Date/huso horario solo para mostrarla en formato dd/mm/yyyy.
function formatSpecificDateLabel(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

function todayFileStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function PdfDownloadButton({ onClick, isLoading }: { onClick: () => void; isLoading: boolean }) {
  return (
    <Button type="button" variant="secondary" onClick={onClick} isLoading={isLoading}>
      <Download className="h-4 w-4" />
      PDF
    </Button>
  );
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

const BUSINESS_PDF_COLUMNS: PdfColumn<TopBusinessDTO>[] = [
  { header: 'Negocio', render: (r) => r.businessName },
  { header: 'Ventas', align: 'right', render: (r) => formatCUP(r.totalSales) },
  { header: 'Comisión', align: 'right', render: (r) => formatCUP(r.totalCommission) },
  { header: 'Pedidos', align: 'right', render: (r) => String(r.orderCount) },
];

function businessPdfTotals(rows: TopBusinessDTO[]): (string | number)[] {
  return [
    'TOTAL',
    formatCUP(rows.reduce((sum, r) => sum + r.totalSales, 0)),
    formatCUP(rows.reduce((sum, r) => sum + r.totalCommission, 0)),
    rows.reduce((sum, r) => sum + r.orderCount, 0),
  ];
}

function TopBusinessesSection({
  filter,
  rangeLabel,
  onViewDetail,
}: {
  filter: ReportsRangeParams;
  rangeLabel: string;
  onViewDetail: (business: TopBusinessDTO) => void;
}) {
  const [mode, setMode] = useState<'top' | 'all'>('top');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(input.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timeout);
  }, [input]);

  useEffect(() => {
    setPage(1);
  }, [filter, mode]);

  const topQuery = useGetTopBusinessesQuery({ ...filter, limit: TOP_LIMIT }, { skip: mode !== 'top' });
  const allQuery = useListReportBusinessesQuery(
    { ...filter, page, pageSize: PAGE_SIZE, search: search || undefined },
    { skip: mode !== 'all' },
  );
  const [fetchAllForExport] = useLazyListReportBusinessesQuery();

  const businesses = mode === 'top' ? topQuery.data?.data ?? [] : allQuery.data?.data ?? [];
  const isLoading = mode === 'top' ? topQuery.isLoading : allQuery.isLoading;

  async function handleExportPdf() {
    setIsExporting(true);
    try {
      // En modo "Todos" la tabla en pantalla solo muestra una página — el PDF trae el negocio
      // completo en una sola pasada (el tope de 100 ya es el máximo que acepta pageSize en el
      // backend, y es más que suficiente para la cantidad de negocios/mensajeros reales del app).
      const rows =
        mode === 'top'
          ? businesses
          : (await fetchAllForExport({ ...filter, page: 1, pageSize: 100, search: search || undefined }).unwrap())
              .data;
      await exportReportPdf({
        title: 'Negocios',
        subtitle: [rangeLabel, mode === 'top' ? `Top ${TOP_LIMIT}` : 'Todos', ...(search ? [`Búsqueda: "${search}"`] : [])],
        fileName: `traelo-negocios-${todayFileStamp()}`,
        columns: BUSINESS_PDF_COLUMNS,
        rows,
        totals: rows.length > 0 ? businessPdfTotals(rows) : undefined,
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Negocios</h2>
        <div className="flex items-center gap-2">
          <PdfDownloadButton onClick={handleExportPdf} isLoading={isExporting} />
          <ViewModeToggle mode={mode} onChange={setMode} />
        </div>
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

const DELIVERER_PDF_COLUMNS: PdfColumn<TopDelivererDTO>[] = [
  { header: 'Mensajero', render: (r) => r.delivererName },
  { header: 'Entregas', align: 'right', render: (r) => String(r.deliveryCount) },
  { header: 'Ganancias', align: 'right', render: (r) => formatCUP(r.totalEarnings) },
  { header: 'Servicio Tráelo', align: 'right', render: (r) => formatCUP(r.platformFeeCollected) },
];

function delivererPdfTotals(rows: TopDelivererDTO[]): (string | number)[] {
  return [
    'TOTAL',
    rows.reduce((sum, r) => sum + r.deliveryCount, 0),
    formatCUP(rows.reduce((sum, r) => sum + r.totalEarnings, 0)),
    formatCUP(rows.reduce((sum, r) => sum + r.platformFeeCollected, 0)),
  ];
}

function TopDeliverersSection({
  filter,
  rangeLabel,
  onViewDetail,
}: {
  filter: ReportsRangeParams;
  rangeLabel: string;
  onViewDetail: (deliverer: TopDelivererDTO) => void;
}) {
  const [mode, setMode] = useState<'top' | 'all'>('top');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(input.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timeout);
  }, [input]);

  useEffect(() => {
    setPage(1);
  }, [filter, mode]);

  const topQuery = useGetTopDeliverersQuery({ ...filter, limit: TOP_LIMIT }, { skip: mode !== 'top' });
  const allQuery = useListReportDeliverersQuery(
    { ...filter, page, pageSize: PAGE_SIZE, search: search || undefined },
    { skip: mode !== 'all' },
  );
  const [fetchAllForExport] = useLazyListReportDeliverersQuery();

  const deliverers = mode === 'top' ? topQuery.data?.data ?? [] : allQuery.data?.data ?? [];
  const isLoading = mode === 'top' ? topQuery.isLoading : allQuery.isLoading;

  async function handleExportPdf() {
    setIsExporting(true);
    try {
      const rows =
        mode === 'top'
          ? deliverers
          : (await fetchAllForExport({ ...filter, page: 1, pageSize: 100, search: search || undefined }).unwrap())
              .data;
      await exportReportPdf({
        title: 'Mensajeros',
        subtitle: [rangeLabel, mode === 'top' ? `Top ${TOP_LIMIT}` : 'Todos', ...(search ? [`Búsqueda: "${search}"`] : [])],
        fileName: `traelo-mensajeros-${todayFileStamp()}`,
        columns: DELIVERER_PDF_COLUMNS,
        rows,
        totals: rows.length > 0 ? delivererPdfTotals(rows) : undefined,
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Mensajeros</h2>
        <div className="flex items-center gap-2">
          <PdfDownloadButton onClick={handleExportPdf} isLoading={isExporting} />
          <ViewModeToggle mode={mode} onChange={setMode} />
        </div>
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

const PRODUCT_PDF_COLUMNS: PdfColumn<TopProductDTO>[] = [
  { header: 'Producto', render: (r) => r.productName },
  { header: 'Negocio', render: (r) => r.businessName },
  { header: 'Unidades', align: 'right', render: (r) => String(r.quantity) },
  { header: 'Ventas', align: 'right', render: (r) => formatCUP(r.totalSales) },
];

function productPdfTotals(rows: TopProductDTO[]): (string | number)[] {
  return [
    'TOTAL',
    '',
    rows.reduce((sum, r) => sum + r.quantity, 0),
    formatCUP(rows.reduce((sum, r) => sum + r.totalSales, 0)),
  ];
}

function TopProductsSection({ filter, rangeLabel }: { filter: ReportsRangeParams; rangeLabel: string }) {
  const { data, isLoading } = useGetTopProductsQuery({ ...filter, limit: TOP_PRODUCTS_LIMIT });
  const products = data?.data ?? [];
  const [isExporting, setIsExporting] = useState(false);

  async function handleExportPdf() {
    setIsExporting(true);
    try {
      await exportReportPdf({
        title: `Productos más vendidos — top ${TOP_PRODUCTS_LIMIT}`,
        subtitle: [rangeLabel],
        fileName: `traelo-productos-${todayFileStamp()}`,
        columns: PRODUCT_PDF_COLUMNS,
        rows: products,
        totals: products.length > 0 ? productPdfTotals(products) : undefined,
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Productos más vendidos — top {TOP_PRODUCTS_LIMIT}
        </h2>
        <PdfDownloadButton onClick={handleExportPdf} isLoading={isExporting} />
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

const CUSTOMER_PDF_COLUMNS: PdfColumn<CustomerReportDTO>[] = [
  { header: 'Cliente', render: (r) => r.customerName },
  { header: 'Teléfono', render: (r) => r.customerPhone },
  { header: 'Pedidos', align: 'right', render: (r) => String(r.orderCount) },
  { header: 'Total gastado', align: 'right', render: (r) => formatCUP(r.totalSpent) },
  { header: 'Aporte a Tráelo', align: 'right', render: (r) => formatCUP(r.traeloContributionTotal) },
];

function customerPdfTotals(rows: CustomerReportDTO[]): (string | number)[] {
  return [
    'TOTAL',
    '',
    rows.reduce((sum, r) => sum + r.orderCount, 0),
    formatCUP(rows.reduce((sum, r) => sum + r.totalSpent, 0)),
    formatCUP(rows.reduce((sum, r) => sum + r.traeloContributionTotal, 0)),
  ];
}

function TopCustomersSection({ filter, rangeLabel }: { filter: ReportsRangeParams; rangeLabel: string }) {
  const [sortBy, setSortBy] = useState<CustomerSortBy>('orderCount');
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: businessesData } = useListBusinessesQuery({ active: true, pageSize: 100 });
  const businessOptions = (businessesData?.data ?? []).map((business) => ({
    value: business.id,
    label: business.name,
  }));
  const businessName = businessOptions.find((b) => b.value === businessId)?.label;

  const { data, isLoading } = useGetTopCustomersQuery({
    ...filter,
    sortBy,
    limit: CUSTOMERS_LIMIT,
    businessId: businessId ?? undefined,
  });
  const customers = data?.data ?? [];

  async function handleExportPdf() {
    setIsExporting(true);
    try {
      await exportReportPdf({
        title: `Clientes recurrentes — top ${CUSTOMERS_LIMIT}`,
        subtitle: [
          rangeLabel,
          `Negocio: ${businessName ?? 'Todos'}`,
          `Orden: ${CUSTOMER_SORT_TABS.find((t) => t.value === sortBy)?.label ?? ''}`,
        ],
        fileName: `traelo-clientes-${todayFileStamp()}`,
        columns: CUSTOMER_PDF_COLUMNS,
        rows: customers,
        totals: customers.length > 0 ? customerPdfTotals(customers) : undefined,
        emptyMessage: 'Sin clientes recurrentes (2+ pedidos) en este periodo.',
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Clientes recurrentes — top {CUSTOMERS_LIMIT}
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-52">
            <SearchableSelect
              label="Negocio"
              value={businessId}
              onChange={setBusinessId}
              options={businessOptions}
              placeholder="Todos los negocios"
            />
          </div>
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
          <PdfDownloadButton onClick={handleExportPdf} isLoading={isExporting} />
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
  const [specificDate, setSpecificDate] = useState<string | null>(null);
  const [businessDetail, setBusinessDetail] = useState<TopBusinessDTO | null>(null);
  const [delivererDetail, setDelivererDetail] = useState<TopDelivererDTO | null>(null);

  const filter = useMemo<ReportsRangeParams>(
    () => filterToParams(specificDate ? { date: specificDate } : { range }),
    [range, specificDate],
  );
  const rangeLabel = specificDate
    ? `Fecha: ${formatSpecificDateLabel(specificDate)}`
    : `Rango: ${RANGE_TABS.find((tab) => tab.value === range)?.label ?? range}`;

  const { data: salesData, isLoading: isSalesLoading } = useGetSalesReportQuery(filter);
  const sales = salesData?.data;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-slate-900">Reportes</h1>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex w-fit gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {RANGE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setRange(tab.value);
                setSpecificDate(null);
              }}
              className={clsx(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                !specificDate && range === tab.value
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={specificDate ?? ''}
            onChange={(e) => setSpecificDate(e.target.value || null)}
            className={clsx(
              'rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500',
              specificDate ? 'border-brand-500 text-brand-700' : 'border-slate-300 text-slate-600',
            )}
          />
          {specificDate && (
            <button
              type="button"
              onClick={() => setSpecificDate(null)}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="Quitar fecha específica"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
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
        <TopBusinessesSection filter={filter} rangeLabel={rangeLabel} onViewDetail={setBusinessDetail} />
        <TopDeliverersSection filter={filter} rangeLabel={rangeLabel} onViewDetail={setDelivererDetail} />
      </div>

      <TopProductsSection filter={filter} rangeLabel={rangeLabel} />

      <TopCustomersSection filter={filter} rangeLabel={rangeLabel} />

      {businessDetail && (
        <BusinessDetailModal
          businessId={businessDetail.businessId}
          businessName={businessDetail.businessName}
          filter={filter}
          onClose={() => setBusinessDetail(null)}
        />
      )}

      {delivererDetail && (
        <DelivererDetailModal
          delivererId={delivererDetail.delivererId}
          delivererName={delivererDetail.delivererName}
          filter={filter}
          onClose={() => setDelivererDetail(null)}
        />
      )}
    </div>
  );
}
