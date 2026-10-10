import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { AlertTriangle, ShoppingCart } from 'lucide-react';
import { formatDateTime } from '@/lib/formatDate';
import type { AbandonedCartDTO } from '@/lib/types';
import { useListBusinessesQuery } from '@/features/businesses/businessesApi';
import { useGetAbandonedCartsQuery } from './behaviorApi';

// En minutos. 120 es el default del backend (behavior.dto.ts) — las demás son atajos comunes
// para "recién lo dejó" vs. "ya pasó bastante rato".
const IDLE_OPTIONS = [
  { value: 60, label: '1h' },
  { value: 120, label: '2h' },
  { value: 360, label: '6h' },
  { value: 1440, label: '24h' },
] as const;

function StageBadge({ stage }: { stage: AbandonedCartDTO['stage'] }) {
  return (
    <span
      className={clsx(
        'rounded-full px-2 py-0.5 text-xs font-medium',
        stage === 'checkout' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600',
      )}
    >
      {stage === 'checkout' ? 'Llegó al checkout' : 'Carrito'}
    </span>
  );
}

function CustomerCell({ cart }: { cart: AbandonedCartDTO }) {
  if (cart.customer) {
    return (
      <div>
        <p className="font-medium text-slate-900">{cart.customer.name}</p>
        <p className="text-xs text-slate-400">{cart.customer.phone}</p>
      </div>
    );
  }
  return (
    <div>
      <p className="font-medium text-slate-500">Invitado</p>
      {cart.visitorId && (
        <p className="text-xs text-slate-400">visitante {cart.visitorId.slice(0, 8)}…</p>
      )}
    </div>
  );
}

export function AbandonedCartsPage() {
  const [idleMinutes, setIdleMinutes] = useState<number>(120);

  const { data, isLoading, isFetching } = useGetAbandonedCartsQuery({ idleMinutes, limit: 200 });
  const report = data?.data;

  // Nombres de negocio para mostrar en vez del id crudo — el reporte no los trae (ver
  // behavior.repository.ts: businessId no tiene FK a propósito, un negocio borrado no debe
  // romper el historial). Los productos SÍ quedan como id: /products es solo OWNER/ADMIN y esta
  // página también la ve EMPLOYEE, así que no se puede resolver ahí sin bajarle el acceso.
  const { data: businessesData } = useListBusinessesQuery({ pageSize: 200 });
  const businessNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const business of businessesData?.data ?? []) map.set(business.id, business.name);
    return map;
  }, [businessesData]);

  const carts = useMemo(() => report?.carts ?? [], [report]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-slate-900">Carritos abandonados</h1>
      <p className="text-sm text-slate-500">
        Personas que agregaron productos al carrito o llegaron a iniciar el checkout, y no
        compraron tras estar inactivas. No incluye a quien ya completó su pedido.
      </p>

      <div className="flex w-fit gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {IDLE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setIdleMinutes(option.value)}
            className={clsx(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              idleMinutes === option.value
                ? 'bg-brand-600 text-white'
                : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            {option.label} sin actividad
          </button>
        ))}
      </div>

      {report && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span>
            Del {formatDateTime(report.from)} al {formatDateTime(report.to)}
          </span>
          <span>·</span>
          <span>{report.total} carritos</span>
          {report.truncated && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              Hubo más actividad que la que este reporte pudo leer — puede faltar alguno.
            </span>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {(isLoading || isFetching) && <p className="p-5 text-slate-400">Cargando…</p>}

        {!isLoading && !isFetching && carts.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-slate-400">
            <ShoppingCart className="h-8 w-8" />
            <p>Nadie quedó con el carrito a medias en este período.</p>
          </div>
        )}

        {!isLoading && !isFetching && carts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Etapa</th>
                  <th className="px-4 py-3">Negocios</th>
                  <th className="px-4 py-3">Productos</th>
                  <th className="px-4 py-3">Última actividad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {carts.map((cart, index) => (
                  <tr key={`${cart.customerId ?? cart.visitorId ?? 'anon'}-${index}`}>
                    <td className="px-4 py-3">
                      <CustomerCell cart={cart} />
                    </td>
                    <td className="px-4 py-3">
                      <StageBadge stage={cart.stage} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {cart.businessIds.map((id) => businessNameById.get(id) ?? id).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {cart.items.length === 0 ? (
                        '—'
                      ) : (
                        <span className="text-xs">
                          {cart.items
                            .map((item) => `${item.quantity}× ${item.productId.slice(0, 8)}…`)
                            .join(', ')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(cart.lastActivityAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
