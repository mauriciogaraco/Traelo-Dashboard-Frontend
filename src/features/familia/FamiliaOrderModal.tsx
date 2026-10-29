import { useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { FormSelect } from '@/components/ui/FormSelect';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { useListDeliverersQuery } from '@/features/deliverers/deliverersApi';
import { getErrorMessage } from '@/lib/getErrorMessage';
import {
  useAssignFamiliaOrderMutation,
  useCancelFamiliaOrderMutation,
  useCompleteFamiliaOrderMutation,
  type FamiliaOrderDTO,
} from './familiaApi';
import { courierMessage, formatUsd, STATUS_LABELS, STATUS_TONES, zoneText } from './familiaText';

type Action = 'none' | 'complete' | 'cancel';

interface FamiliaOrderModalProps {
  order: FamiliaOrderDTO;
  onClose: () => void;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function FamiliaOrderModal({ order, onClose }: FamiliaOrderModalProps) {
  const { showToast } = useToast();
  const open = order.status === 'PENDING' || order.status === 'ASSIGNED';
  const [action, setAction] = useState<Action>('none');
  const [delivererId, setDelivererId] = useState(order.deliverer?.id ?? '');
  const [payment, setPayment] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Mensajeros activos para elegir a mano (la lista respeta la ciudad activa del dashboard).
  const { data: deliverers } = useListDeliverersQuery({ active: true, pageSize: 100 });
  const options = useMemo(() => deliverers?.data.filter((d) => d.active) ?? [], [deliverers]);

  const [assign, { isLoading: assigning }] = useAssignFamiliaOrderMutation();
  const [complete, { isLoading: completing }] = useCompleteFamiliaOrderMutation();
  const [cancel, { isLoading: cancelling }] = useCancelFamiliaOrderMutation();

  const byBusiness = useMemo(() => {
    const groups = new Map<string, FamiliaOrderDTO['items']>();
    for (const item of order.items) groups.set(item.businessName, [...(groups.get(item.businessName) ?? []), item]);
    return [...groups.entries()];
  }, [order.items]);

  async function run(task: () => Promise<unknown>, done: string) {
    setError(null);
    try {
      await task();
      showToast(done, 'success');
      onClose();
    } catch (e) {
      setError(getErrorMessage(e as Parameters<typeof getErrorMessage>[0]));
    }
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(courierMessage(order));
      showToast('Datos copiados para el mensajero', 'success');
    } catch {
      showToast('No se pudo copiar', 'error');
    }
  }

  const paymentNumber = Number(payment);
  const paymentValid = payment.trim() !== '' && Number.isFinite(paymentNumber) && paymentNumber >= 0;

  return (
    <Modal title={`Pedido Familia #${order.orderNumber}`} onClose={onClose} widthClassName="max-w-2xl">
      <div className="flex min-h-0 flex-col gap-5 overflow-y-auto">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONES[order.status]}>{STATUS_LABELS[order.status]}</Badge>
          <span className="text-sm text-slate-500">Recibido {formatDateTime(order.createdAt)}</span>
        </div>

        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <section className="space-y-1">
            <h3 className="font-semibold text-slate-900">Comprador (paga por Zelle)</h3>
            <p className="text-slate-700">{order.buyerName}</p>
            <p className="text-slate-500">WhatsApp: {order.buyerWhatsapp}</p>
          </section>
          <section className="space-y-1">
            <h3 className="font-semibold text-slate-900">Entrega</h3>
            <p className="text-slate-700">{order.recipientName}</p>
            <p className="text-slate-500">{zoneText(order)}</p>
            <p className="text-slate-500">{order.address}</p>
            {order.notes && <p className="text-amber-700">Obs.: {order.notes}</p>}
          </section>
        </div>

        <section className="space-y-3">
          {byBusiness.map(([business, items]) => (
            <div key={business} className="rounded-lg border border-slate-200">
              <p className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">{business}</p>
              <ul className="divide-y divide-slate-100 text-sm">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 px-3 py-2">
                    <span className="text-slate-700">
                      {item.productName}
                      {item.optionName && <span className="text-slate-500"> ({item.optionName})</span>}
                      {item.addonName && <span className="text-slate-500"> + {item.addonName}</span>}
                      {item.packagingName && <span className="text-slate-500"> [{item.packagingName}]</span>}
                      <span className="text-slate-500">
                        {' '}
                        {item.pack > 1 ? `· ${item.quantity * item.pack} u (${item.quantity} × ${item.pack})` : `× ${item.quantity}`}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-900">{formatUsd(item.lineTotalUsd)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatUsd(order.subtotalUsd)} USD</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Comisión Zelle</span>
              <span className="tabular-nums">{formatUsd(order.zelleFeeUsd)} USD</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-900">
              <span>Total Zelle</span>
              <span className="tabular-nums">{formatUsd(order.totalUsd)} USD</span>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-slate-200 p-3">
          <h3 className="text-sm font-semibold text-slate-900">Mensajero</h3>
          {order.deliverer && (
            <p className="text-sm text-slate-700">
              {order.deliverer.name}
              {order.deliverer.phone ? ` · ${order.deliverer.phone}` : ''}
              {order.assignedAt && <span className="text-slate-500"> · asignado {formatDateTime(order.assignedAt)}</span>}
            </p>
          )}
          {order.status === 'COMPLETED' && order.delivererPayment !== null && (
            <p className="text-sm text-slate-700">
              Pago al mensajero: <strong>{order.delivererPayment.toLocaleString('es')} CUP</strong>
            </p>
          )}
          {order.status === 'CANCELLED' && (
            <p className="text-sm text-slate-500">Cancelado{order.cancellationReason ? `: ${order.cancellationReason}` : ''}</p>
          )}

          {open && (
            <>
              <p className="text-xs text-slate-500">
                La asignación es manual y no pasa por la cola: el mensajero no recibe nada en su app, así que avísale con
                el botón de abajo.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-56 flex-1">
                  <FormSelect label="Elegir mensajero" value={delivererId} onChange={(e) => setDelivererId(e.target.value)}>
                    <option value="">Selecciona…</option>
                    {options.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </FormSelect>
                </div>
                <Button
                  type="button"
                  disabled={!delivererId || assigning || delivererId === order.deliverer?.id}
                  onClick={() => run(() => assign({ id: order.id, delivererId }).unwrap(), 'Mensajero asignado')}
                >
                  {order.deliverer ? 'Reasignar' : 'Asignar'}
                </Button>
                <Button type="button" variant="secondary" onClick={copyMessage}>
                  <Copy className="h-4 w-4" />
                  Copiar datos
                </Button>
              </div>
            </>
          )}
        </section>

        {open && action === 'none' && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAction('cancel')}>
              Cancelar pedido
            </Button>
            <Button
              type="button"
              disabled={order.status !== 'ASSIGNED'}
              title={order.status !== 'ASSIGNED' ? 'Asigna un mensajero primero' : undefined}
              onClick={() => setAction('complete')}
            >
              Marcar completado
            </Button>
          </div>
        )}

        {open && action === 'complete' && (
          <section className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-3">
            <h3 className="text-sm font-semibold text-green-900">Completar pedido</h3>
            <FormField
              label="Cantidad pagada al mensajero (CUP)"
              type="number"
              min={0}
              inputMode="decimal"
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              placeholder="Ej.: 450 (0 si no se le pagó)"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setAction('none')}>
                Volver
              </Button>
              <Button
                type="button"
                disabled={!paymentValid || completing}
                onClick={() =>
                  run(() => complete({ id: order.id, delivererPayment: paymentNumber }).unwrap(), 'Pedido completado')
                }
              >
                Confirmar
              </Button>
            </div>
          </section>
        )}

        {open && action === 'cancel' && (
          <section className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <h3 className="text-sm font-semibold text-red-900">Cancelar pedido</h3>
            <FormField label="Motivo (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setAction('none')}>
                Volver
              </Button>
              <Button
                type="button"
                disabled={cancelling}
                onClick={() => run(() => cancel({ id: order.id, reason: reason.trim() || undefined }).unwrap(), 'Pedido cancelado')}
              >
                Cancelar pedido
              </Button>
            </div>
          </section>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}
