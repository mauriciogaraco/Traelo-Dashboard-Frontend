import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useListBusinessesQuery } from '@/features/businesses/businessesApi';
import { useListDeliverersQuery } from '@/features/deliverers/deliverersApi';
import { formatDateTime } from '@/lib/formatDate';
import { ReviewOrderModal } from './ReviewOrderModal';
import {
  useListReviewsQuery,
  type ListReviewsParams,
  type ReviewListItemDTO,
  type ReviewRangePreset,
  type ReviewTypeFilter,
} from './reviewsApi';

const PAGE_SIZE = 20;

const TYPE_TABS: { value: ReviewTypeFilter; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'DELIVERER', label: 'Mensajeros' },
  { value: 'BUSINESS', label: 'Negocios' },
];

const RANGE_TABS: { value: ReviewRangePreset | 'all'; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: '6months', label: 'Semestre' },
  { value: 'year', label: 'Año' },
  { value: 'all', label: 'Todas' },
];

type RatingFilter = 'ALL' | 'NEGATIVE' | 'REGULAR' | 'GOOD';

// Las calificaciones van de 1.0 a 5.0: negativa = menos de 3, regular = de 3 a menos de 4, buena = 4 o más.
const RATING_FILTERS: { value: RatingFilter; label: string; params: Pick<ListReviewsParams, 'ratingMin' | 'ratingBelow'> }[] = [
  { value: 'ALL', label: 'Todas las calificaciones', params: {} },
  { value: 'NEGATIVE', label: 'Negativas (menos de 3)', params: { ratingBelow: 3 } },
  { value: 'REGULAR', label: 'Regulares (3 a 3.9)', params: { ratingMin: 3, ratingBelow: 4 } },
  { value: 'GOOD', label: 'Buenas (4 o más)', params: { ratingMin: 4 } },
];

function ratingTone(rating: number): string {
  if (rating < 3) return 'text-red-600';
  if (rating < 4) return 'text-amber-600';
  return 'text-green-600';
}

function Rating({ value }: { value: number }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 font-semibold', ratingTone(value))}>
      <Star className="h-4 w-4 fill-current" />
      {value.toFixed(1)}
    </span>
  );
}

export function ReviewsPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<ReviewTypeFilter>('ALL');
  const [range, setRange] = useState<ReviewRangePreset | 'all'>('all');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('ALL');
  const [delivererId, setDelivererId] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  // Reseña tocada: se abre el detalle de su pedido.
  const [selected, setSelected] = useState<ReviewListItemDTO | null>(null);

  useEffect(() => {
    setPage(1);
  }, [type, range, ratingFilter, delivererId, businessId]);

  const { data: deliverersData } = useListDeliverersQuery({ pageSize: 100 });
  const { data: businessesData } = useListBusinessesQuery({ pageSize: 100 });
  const delivererOptions = (deliverersData?.data ?? []).map((d) => ({ value: d.id, label: d.name }));
  const businessOptions = (businessesData?.data ?? []).map((b) => ({ value: b.id, label: b.name }));

  const ratingParams = RATING_FILTERS.find((f) => f.value === ratingFilter)?.params ?? {};
  const { data, isLoading, isFetching, error } = useListReviewsQuery({
    page,
    pageSize: PAGE_SIZE,
    type,
    ...(delivererId ? { delivererId } : {}),
    ...(businessId ? { businessId } : {}),
    ...ratingParams,
    ...(range === 'all' ? {} : { range }),
  });

  const rows = data?.data ?? [];
  const summary = data?.summary;

  // Elegir un mensajero deja fuera los negocios y al revés: solo uno de los dos a la vez.
  function pickDeliverer(value: string | null) {
    setDelivererId(value);
    if (value) setBusinessId(null);
  }
  function pickBusiness(value: string | null) {
    setBusinessId(value);
    if (value) setDelivererId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Reseñas</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Qué cliente calificó a qué mensajero o negocio, y con qué nota.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-md">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Reseñas</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary?.count ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Promedio</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {summary?.average != null ? <Rating value={summary.average} /> : '—'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex w-fit gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setType(tab.value)}
              className={clsx(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                type === tab.value ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {tab.label}
            </button>
          ))}
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
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value as RatingFilter)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {RATING_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <div className="w-56">
          <SearchableSelect
            label=""
            value={delivererId}
            onChange={pickDeliverer}
            options={delivererOptions}
            placeholder="Todos los mensajeros"
          />
        </div>
        <div className="w-56">
          <SearchableSelect
            label=""
            value={businessId}
            onChange={pickBusiness}
            options={businessOptions}
            placeholder="Todos los negocios"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Calificación</th>
              <th className="px-4 py-3 font-medium">Quién calificó</th>
              <th className="px-4 py-3 font-medium">A quién</th>
              <th className="px-4 py-3 font-medium">Pedido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-red-600">
                  No se pudieron cargar las reseñas.
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No hay reseñas con estos filtros.
                </td>
              </tr>
            ) : (
              rows.map((review) => (
                <tr
                  key={`${review.type}-${review.id}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Ver el pedido #${review.orderNumber}`}
                  onClick={() => setSelected(review)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelected(review);
                    }
                  }}
                  className="cursor-pointer text-slate-700 transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(review.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Rating value={review.rating} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">{review.customer.name}</span>
                      {review.customer.isGuest && <Badge tone="slate">Invitado</Badge>}
                    </div>
                    <p className="text-xs text-slate-500">{review.customer.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={review.type === 'DELIVERER' ? 'brand' : 'amber'}>
                        {review.type === 'DELIVERER' ? 'Mensajero' : 'Negocio'}
                      </Badge>
                      <span className="font-medium text-slate-900">
                        {review.deliverer?.name ?? review.business?.name ?? '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/orders/${review.orderId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-brand-600 hover:underline"
                    >
                      #{review.orderNumber}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </div>
      {isFetching && !isLoading && <p className="text-xs text-slate-400">Actualizando…</p>}
      {selected && <ReviewOrderModal review={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
