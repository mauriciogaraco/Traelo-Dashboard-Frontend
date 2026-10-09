import { useState } from 'react';
import { ExternalLink, FileDown, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useGetOrderQuery } from '@/features/orders/ordersApi';
import { formatDateTime } from '@/lib/formatDate';
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from '@/lib/labels';
import { exportOrderPdf } from '@/lib/orderPdf';
import type { OrderItemDTO } from '@/lib/types';
import type { ReviewListItemDTO } from './reviewsApi';

const cup = (value: number) => `${Math.round(value * 100) / 100} CUP`;

function itemName(item: OrderItemDTO): string {
  const variant = [item.optionName, item.addonName ? `+ ${item.addonName}` : null].filter(Boolean).join(' ');
  return variant ? `${item.productName} (${variant})` : item.productName;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{children}</dd>
    </div>
  );
}

/** Detalle del pedido al que pertenece una reseña, sin salir de la lista de reseñas. */
export function ReviewOrderModal({ review, onClose }: { review: ReviewListItemDTO; onClose: () => void }) {
  const { data, isLoading, error } = useGetOrderQuery(review.orderId);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const order = data?.data;

  async function handleDownloadPdf() {
    if (!order) return;
    setPdfBusy(true);
    setPdfError(null);
    try {
      await exportOrderPdf(order);
    } catch {
      setPdfError('No se pudo generar el PDF. Intenta de nuevo.');
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <Modal title={`Pedido #${review.orderNumber}`} onClose={onClose} widthClassName="max-w-xl">
      <div className="flex flex-col gap-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Esta reseña</p>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
              <Star className="h-4 w-4 fill-current text-amber-500" />
              {review.rating.toFixed(1)}
            </span>
            <Badge tone={review.type === 'DELIVERER' ? 'brand' : 'amber'}>
              {review.type === 'DELIVERER' ? 'Mensajero' : 'Negocio'}
            </Badge>
            <span className="font-medium text-slate-900">{review.deliverer?.name ?? review.business?.name}</span>
            <span className="text-slate-500">· de {review.customer.name}</span>
          </p>
        </div>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-slate-400">Cargando pedido…</p>
        ) : error || !order ? (
          <p className="py-6 text-center text-sm text-red-600">No se pudo cargar el pedido.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <Badge tone={ORDER_STATUS_TONE[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
              <span>{formatDateTime(order.orderDate)}</span>
              {order.completedAt && <span>· Entregado {formatDateTime(order.completedAt)}</span>}
            </div>

            {order.status === 'CANCELLED' && order.cancellationReason && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <p className="font-semibold">Motivo de la cancelación</p>
                <p className="mt-0.5 whitespace-pre-line">{order.cancellationReason}</p>
              </div>
            )}

            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Cliente</h3>
              <dl className="space-y-1.5">
                <Row label="Nombre">{order.customerName}</Row>
                <Row label="Teléfono">{order.customerPhone}</Row>
                <Row label="Dirección">{order.customerAddress}</Row>
                {order.addressReference && <Row label="Referencia">{order.addressReference}</Row>}
                <Row label="Mensajero">{order.delivererName ?? 'Sin asignar'}</Row>
              </dl>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Productos</h3>
              <div className="flex flex-col gap-3">
                {order.businesses.map((business) => (
                  <div key={business.id} className="rounded-xl border border-slate-200">
                    <p className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900">
                      {business.businessName}
                    </p>
                    <ul className="divide-y divide-slate-100">
                      {business.items.map((item) => (
                        <li key={item.id} className="flex justify-between gap-3 px-3 py-2 text-sm text-slate-700">
                          <span>
                            {item.quantity} x {itemName(item)}
                          </span>
                          <span className="shrink-0 font-medium text-slate-900">{cup(item.subtotal)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Resumen</h3>
              <dl className="space-y-1.5">
                <Row label="Productos">{cup(order.productsTotal)}</Row>
                <Row label="Mensajería">{cup(order.deliveryFee)}</Row>
                <Row label="Servicio Tráelo">{cup(order.platformFee)}</Row>
                {(order.pointsRedeemed ?? 0) > 0 && (
                  <Row label={`Puntos canjeados (${order.pointsRedeemed})`}>- {cup(order.pointsDiscount ?? 0)}</Row>
                )}
                <div className="flex justify-between gap-4 border-t border-slate-100 pt-2 text-base">
                  <dt className="font-semibold text-slate-900">Total</dt>
                  <dd className="font-semibold text-slate-900">{cup(order.total)}</dd>
                </div>
              </dl>
            </section>
          </>
        )}

        {pdfError && <p className="text-sm text-red-600">{pdfError}</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" disabled={!order} isLoading={pdfBusy} onClick={handleDownloadPdf}>
            <FileDown className="h-4 w-4" />
            Descargar PDF
          </Button>
          <Link to={`/orders/${review.orderId}`}>
            <Button type="button">
              <ExternalLink className="h-4 w-4" />
              Abrir pedido
            </Button>
          </Link>
        </div>
      </div>
    </Modal>
  );
}
