import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, GitMerge, Split } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import type { SerializedError } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { useAppSelector } from '@/app/hooks';
import { getErrorMessage } from '@/lib/getErrorMessage';
import type { OrderDTO } from '@/lib/types';
import {
  useListMergeSuggestionsQuery,
  useResolveMergeDecisionMutation,
  type MergeDecision,
  type MergeSuggestion,
} from './ordersApi';
import { playMergeAlarm } from './mergeAlarmSound';

/** Cada cuánto se consulta si hay pedidos por decidir. */
const POLL_MS = 15_000;
/** Mientras nadie decida, la alarma vuelve a sonar y el modal a abrirse cada 3 minutos. */
export const ALARM_REPEAT_MS = 3 * 60_000;

const STAFF_ROLES = ['OWNER', 'ADMIN', 'EMPLOYEE'];

const cup = (value: number) => `${Math.round(value).toLocaleString('es')} CUP`;

function OrderColumn({ title, order, tone }: { title: string; order: OrderDTO; tone: 'target' | 'new' }) {
  return (
    <div className={`rounded-xl border p-3 ${tone === 'new' ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">
        Pedido #{order.orderNumber} · {order.status}
      </p>
      <p className="text-xs text-slate-500">
        {new Date(order.orderDate).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
        {order.delivererName ? ` · Mensajero: ${order.delivererName}` : ' · Sin mensajero'}
      </p>
      <ul className="mt-2 space-y-2 text-sm">
        {order.businesses.map((business) => (
          <li key={business.id}>
            <p className="font-medium text-slate-800">{business.businessName}</p>
            <ul className="text-slate-600">
              {business.items.map((item) => (
                <li key={item.id}>
                  {item.quantity} × {item.productName}
                  {item.optionName ? ` (${item.optionName})` : ''}
                  {item.addonName ? ` + ${item.addonName}` : ''}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-500">
        Productos {cup(order.productsTotal)} · Mensajería {cup(order.deliveryFee)} · Servicio {cup(order.platformFee)}
      </p>
      <p className="text-sm font-semibold text-slate-900">Total {cup(order.total)}</p>
    </div>
  );
}

function SuggestionCard({ suggestion, busy, onDecide }: { suggestion: MergeSuggestion; busy: boolean; onDecide: (decision: MergeDecision) => void }) {
  const { newOrder, targetOrder, preview } = suggestion;
  return (
    <section className="rounded-2xl border border-slate-200 p-4">
      <p className="text-sm text-slate-700">
        <strong>{newOrder.customerName}</strong> ({newOrder.customerPhone}) hizo el pedido <strong>#{newOrder.orderNumber}</strong> mientras
        su pedido <strong>#{targetOrder.orderNumber}</strong> sigue activo.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <OrderColumn title="Vale actual" order={targetOrder} tone="target" />
        <OrderColumn title="Pedido nuevo" order={newOrder} tone="new" />
      </div>

      {preview ? (
        <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm" data-testid="merge-preview">
          <p className="font-semibold text-slate-900">Si se fusionan (un solo vale)</p>
          <p className="text-slate-700">
            Productos {cup(preview.productsTotal)} · Mensajería {cup(preview.deliveryFee)}{' '}
            <span className="text-slate-500">(separadas: {cup(preview.separateDeliveryFees)})</span> · Servicio {cup(preview.platformFee)}
          </p>
          <p className="font-semibold text-slate-900">
            Total {cup(preview.total)} <span className="font-normal text-slate-500">(por separado: {cup(preview.separateTotals)})</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Se avisará al mensajero y al cliente del vale actualizado; el pedido #{newOrder.orderNumber} queda cancelado dentro del #{targetOrder.orderNumber}.
          </p>
        </div>
      ) : (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" data-testid="merge-blocked">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {suggestion.blockedReason ?? 'No se puede fusionar.'}
        </p>
      )}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => onDecide('SEPARATE')} disabled={busy}>
          <Split className="h-4 w-4" /> Dejar como pedido aparte
        </Button>
        <Button onClick={() => onDecide('MERGE')} disabled={busy || !suggestion.canMerge} title={suggestion.canMerge ? undefined : suggestion.blockedReason ?? undefined}>
          <GitMerge className="h-4 w-4" /> Fusionar en un solo vale
        </Button>
      </div>
    </section>
  );
}

/**
 * Alarma y modal de fusión de pedidos: cuando el mismo teléfono pide otra vez a los pocos minutos, el
 * staff decide aquí si se junta en un solo vale o queda aparte. Mientras haya pedidos sin decidir se
 * muestra un banner fijo y, cada 3 minutos, suena la alarma y vuelve a abrirse el modal.
 */
export function MergeSuggestionsAlarm() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const isStaff = role !== undefined && STAFF_ROLES.includes(role);
  const { showToast } = useToast();
  const { data } = useListMergeSuggestionsQuery(undefined, { skip: !isStaff, pollingInterval: POLL_MS });
  const [resolve, { isLoading }] = useResolveMergeDecisionMutation();
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => data?.data ?? [], [data]);
  const pendingKey = suggestions.map((s) => s.newOrder.id).join(',');
  const previousKey = useRef('');

  // Llegó (o cambió) algo por decidir: modal abierto y alarma al instante.
  useEffect(() => {
    if (pendingKey === '') {
      setOpen(false);
      previousKey.current = '';
      return;
    }
    if (pendingKey !== previousKey.current) {
      const hasNew = pendingKey.split(',').some((id) => !previousKey.current.split(',').includes(id));
      previousKey.current = pendingKey;
      if (hasNew) {
        setOpen(true);
        playMergeAlarm();
      }
    }
  }, [pendingKey]);

  // Sin decidir: cada 3 minutos vuelve a sonar y a abrirse.
  useEffect(() => {
    if (suggestions.length === 0) return undefined;
    const timer = window.setInterval(() => {
      setOpen(true);
      playMergeAlarm();
    }, ALARM_REPEAT_MS);
    return () => window.clearInterval(timer);
  }, [suggestions.length]);

  async function decide(suggestion: MergeSuggestion, decision: MergeDecision) {
    try {
      await resolve({ id: suggestion.newOrder.id, decision }).unwrap();
      showToast(
        decision === 'MERGE'
          ? `Pedidos fusionados: un solo vale (#${suggestion.targetOrder.orderNumber})`
          : `El pedido #${suggestion.newOrder.orderNumber} sigue como pedido aparte`,
        'success',
      );
    } catch (error) {
      showToast(getErrorMessage(error as FetchBaseQueryError | SerializedError), 'error');
    }
  }

  if (!isStaff || suggestions.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full animate-pulse items-center justify-center gap-2 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        data-testid="merge-banner"
      >
        <AlertTriangle className="h-4 w-4" />
        {suggestions.length === 1 ? '1 pedido por decidir' : `${suggestions.length} pedidos por decidir`}: el mismo cliente pidió otra vez. Toca para
        resolver.
      </button>

      {open ? (
        <Modal title="Pedido repetido: ¿fusionar o dejar aparte?" onClose={() => setOpen(false)} widthClassName="max-w-4xl">
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <SuggestionCard key={suggestion.newOrder.id} suggestion={suggestion} busy={isLoading} onDecide={(decision) => decide(suggestion, decision)} />
            ))}
            <p className="text-xs text-slate-500">
              Mientras no se decida, el pedido nuevo no se asigna a ningún mensajero. Esta alarma se repite cada 3 minutos.
            </p>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
