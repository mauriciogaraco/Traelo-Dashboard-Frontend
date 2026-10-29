import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { FamiliaOrderModal } from './FamiliaOrderModal';
import { useFamiliaCountsQuery, useListFamiliaOrdersQuery, type FamiliaOrderDTO, type FamiliaStatus } from './familiaApi';
import { formatUsd, STATUS_LABELS, STATUS_TONES, zoneText } from './familiaText';

const PAGE_SIZE = 15;

// Las listas de Familia: una por estado (lo pendiente primero) y "Todos". Estos pedidos NO aparecen en
// "Pedidos": tienen su propia lista y se asignan a mano.
const TABS: { value: FamiliaStatus | 'ALL'; label: string }[] = [
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'ASSIGNED', label: 'Asignados' },
  { value: 'COMPLETED', label: 'Completados' },
  { value: 'CANCELLED', label: 'Cancelados' },
  { value: 'ALL', label: 'Todos' },
];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function FamiliaPage() {
  const [tab, setTab] = useState<FamiliaStatus | 'ALL'>('PENDING');
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [tab, search]);

  const { data: counts } = useFamiliaCountsQuery(undefined, { pollingInterval: 60_000 });
  const { data, isLoading, isFetching } = useListFamiliaOrdersQuery(
    { page, pageSize: PAGE_SIZE, status: tab === 'ALL' ? undefined : tab, search: search || undefined },
    { pollingInterval: 60_000 },
  );

  const rows = data?.data ?? [];
  // El modal se arma con la fila viva de la lista: al asignar/completar la lista se refresca y el modal se cierra.
  const selected: FamiliaOrderDTO | undefined = rows.find((order) => order.id === selectedId);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Tráelo Familia</h1>
        <p className="text-sm text-slate-500">
          Pedidos de la diáspora (USD por Zelle). Se asignan a mano: no pasan por la cola ni aparecen en la lista de pedidos.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex w-fit gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {TABS.map((item) => {
            const count = item.value === 'ALL' ? undefined : counts?.data[item.value];
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setTab(item.value)}
                className={clsx(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  tab === item.value ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                {item.label}
                {count !== undefined && count > 0 && (
                  <span
                    className={clsx(
                      'rounded-full px-1.5 text-xs',
                      tab === item.value ? 'bg-white/25 text-white' : item.value === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre, WhatsApp o #…"
            className="rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Recibido</th>
              <th className="px-4 py-3 font-medium">Comprador</th>
              <th className="px-4 py-3 font-medium">Entrega</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Mensajero</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className={clsx('divide-y divide-slate-100', isFetching && !isLoading && 'opacity-70')}>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No hay pedidos de Familia en esta lista.
                </td>
              </tr>
            )}
            {rows.map((order) => (
              <tr
                key={order.id}
                tabIndex={0}
                onClick={() => setSelectedId(order.id)}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedId(order.id)}
                className="cursor-pointer text-slate-700 hover:bg-slate-50"
              >
                <td className="px-4 py-3 font-medium text-slate-900">#{order.orderNumber}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(order.createdAt)}</td>
                <td className="px-4 py-3">
                  {order.buyerName}
                  <p className="text-xs text-slate-500">{order.buyerWhatsapp}</p>
                </td>
                <td className="px-4 py-3">
                  {order.recipientName}
                  <p className="text-xs text-slate-500">{zoneText(order)}</p>
                </td>
                <td className="px-4 py-3 tabular-nums">{formatUsd(order.totalUsd)}</td>
                <td className="px-4 py-3">{order.deliverer?.name ?? <span className="text-slate-400">Sin asignar</span>}</td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONES[order.status]}>{STATUS_LABELS[order.status]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </div>

      {selected && <FamiliaOrderModal key={selected.id} order={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
