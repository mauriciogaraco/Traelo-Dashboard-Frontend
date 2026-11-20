import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { useListCitiesQuery } from '@/features/cities/citiesApi';
import { formatDate } from '@/lib/formatDate';
import { CreatePosBusinessModal } from './CreatePosBusinessModal';
import { useListPosBusinessesQuery, type PosBusinessDTO } from './posApi';

const PAGE_SIZE = 10;

const SUBSCRIPTION_LABEL: Record<
  NonNullable<PosBusinessDTO['subscription']>['status'],
  { label: string; tone: 'green' | 'red' | 'amber' }
> = {
  active: { label: 'Activa', tone: 'green' },
  expired: { label: 'Vencida', tone: 'red' },
  cancelled: { label: 'Cancelada', tone: 'amber' },
};

const selectClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

export function PosBusinessesPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [cityId, setCityId] = useState('');
  const [status, setStatus] = useState<'' | 'active' | 'suspended'>('');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, cityId, status]);

  const { data: citiesData } = useListCitiesQuery({
    active: true,
    pageSize: 100,
  });
  const { data, isLoading, isFetching, isError } = useListPosBusinessesQuery({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    cityId: cityId || undefined,
    status: status || undefined,
  });
  const rows = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Sistema POS</h1>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Nuevo negocio POS
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre…"
            className="rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <select value={cityId} onChange={(e) => setCityId(e.target.value)} className={selectClass}>
          <option value="">Todas las ciudades</option>
          {(citiesData?.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as '' | 'active' | 'suspended')}
          className={selectClass}
        >
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="suspended">Suspendidos</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Ciudad</th>
              <th className="px-4 py-3 font-medium">Contacto</th>
              <th className="px-4 py-3 font-medium">Catálogo</th>
              <th className="px-4 py-3 font-medium">Suscripción</th>
              <th className="px-4 py-3 font-medium">Dispositivos</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-red-600">
                  No se pudo cargar la lista de negocios POS.
                </td>
              </tr>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No hay negocios POS que coincidan con los filtros.
                </td>
              </tr>
            )}
            {rows.map((b) => {
              const sub = b.subscription ? SUBSCRIPTION_LABEL[b.subscription.status] : null;
              return (
                <tr key={b.id} className="text-slate-700">
                  <td className="px-4 py-3 font-medium text-slate-900">{b.name}</td>
                  <td className="px-4 py-3">{b.cityName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div>{b.phone ?? '—'}</div>
                    {b.address && (
                      <div className="max-w-xs truncate text-xs text-slate-500" title={b.address}>
                        {b.address}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {b.linkedBusiness ? (
                      b.linkedBusiness.name
                    ) : (
                      <span className="text-slate-400">Solo POS</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {b.subscription && sub ? (
                      <div className="flex flex-col gap-1">
                        <Badge tone={sub.tone}>{sub.label}</Badge>
                        <span className="text-xs text-slate-500">
                          hasta {formatDate(b.subscription.endsAt)}
                        </span>
                      </div>
                    ) : (
                      <Badge tone="slate">Sin suscripción</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">{b.activeDevices}</td>
                  <td className="px-4 py-3">
                    <Badge tone={b.status === 'active' ? 'green' : 'slate'}>
                      {b.status === 'active' ? 'Activo' : 'Suspendido'}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </div>
      {isFetching && !isLoading && <p className="text-xs text-slate-400">Actualizando…</p>}

      {createOpen && <CreatePosBusinessModal onClose={() => setCreateOpen(false)} />}
    </div>
  );
}
