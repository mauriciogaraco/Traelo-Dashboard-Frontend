import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useListDeliverersQuery } from '@/features/deliverers/deliverersApi';
import { formatDateTime } from '@/lib/formatDate';
import { ORDER_STATUS_LABEL } from '@/lib/labels';
import type { OrderStatus } from '@/lib/types';
import {
  useAssignOrderMutation,
  useDeleteOrderMutation,
  useGetOrderQuery,
  useUpdateOrderStatusMutation,
} from './ordersApi';

const STATUS_TONE: Record<OrderStatus, 'amber' | 'brand' | 'green' | 'slate'> = {
  PENDING: 'amber',
  ASSIGNED: 'brand',
  COMPLETED: 'green',
  CANCELLED: 'slate',
};

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.user);
  const canManage = currentUser?.role !== 'DELIVERER';
  const canDelete = currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN';

  const [assigningDelivererId, setAssigningDelivererId] = useState<string | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading, error } = useGetOrderQuery(id ?? '', { skip: !id });
  const { data: deliverersData } = useListDeliverersQuery(
    { pageSize: 100, active: true },
    { skip: !canManage },
  );
  const [assignOrder, { isLoading: isAssigning }] = useAssignOrderMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateOrderStatusMutation();
  const [deleteOrder, { isLoading: isDeleting }] = useDeleteOrderMutation();

  if (isLoading) {
    return <p className="text-slate-400">Cargando…</p>;
  }
  if (error || !data) {
    return <p className="text-red-600">No se pudo cargar el pedido.</p>;
  }

  const order = data.data;
  const canEdit = canManage && order.status !== 'CANCELLED';
  const canAssign = canManage && (order.status === 'PENDING' || order.status === 'ASSIGNED');
  const canComplete = canManage && order.status === 'ASSIGNED';
  const canCancel = canManage && (order.status === 'PENDING' || order.status === 'ASSIGNED');
  const canDeleteOrder = canDelete && order.status !== 'COMPLETED';

  const delivererOptions = (deliverersData?.data ?? []).map((d) => ({
    value: d.id,
    label: d.name,
    sublabel: d.phone ?? undefined,
  }));

  async function handleAssign() {
    if (!assigningDelivererId || !id) return;
    await assignOrder({ id, delivererId: assigningDelivererId }).unwrap();
    setAssigningDelivererId(null);
  }

  async function handleComplete() {
    if (!id) return;
    await updateStatus({ id, status: 'COMPLETED' }).unwrap();
    setCompleteOpen(false);
  }

  async function handleCancel() {
    if (!id) return;
    await updateStatus({ id, status: 'CANCELLED' }).unwrap();
    setCancelOpen(false);
  }

  async function handleDelete() {
    if (!id) return;
    await deleteOrder(id).unwrap();
    navigate('/orders', { replace: true });
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/orders"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Pedidos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">Pedido #{order.orderNumber}</h1>
            <Badge tone={STATUS_TONE[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Registrado por {order.registeredByName} · {formatDateTime(order.orderDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Link to={`/orders/${order.id}/edit`}>
              <Button type="button" variant="secondary">
                Editar
              </Button>
            </Link>
          )}
          {canComplete && (
            <Button type="button" onClick={() => setCompleteOpen(true)}>
              Completar
            </Button>
          )}
          {canCancel && (
            <Button type="button" variant="danger" onClick={() => setCancelOpen(true)}>
              Cancelar
            </Button>
          )}
          {canDeleteOrder && (
            <Button type="button" variant="danger" onClick={() => setDeleteOpen(true)}>
              Eliminar
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Cliente</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Nombre</dt>
              <dd className="text-right font-medium text-slate-900">{order.customerName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Teléfono</dt>
              <dd className="text-right font-medium text-slate-900">{order.customerPhone}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Dirección</dt>
              <dd className="text-right font-medium text-slate-900">{order.customerAddress}</dd>
            </div>
            {order.addressReference && (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Referencia</dt>
                <dd className="text-right font-medium text-slate-900">
                  {order.addressReference}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Mensajero</h2>
          {order.delivererName ? (
            <p className="text-sm font-medium text-slate-900">{order.delivererName}</p>
          ) : (
            <p className="text-sm text-slate-400">Sin asignar</p>
          )}
          {canAssign && (
            <div className="mt-3 flex items-end gap-2">
              <div className="flex-1">
                <SearchableSelect
                  label=""
                  value={assigningDelivererId}
                  onChange={setAssigningDelivererId}
                  options={delivererOptions}
                  placeholder="Buscar mensajero…"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={!assigningDelivererId}
                isLoading={isAssigning}
                onClick={handleAssign}
              >
                {order.delivererName ? 'Reasignar' : 'Asignar'}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Negocio</th>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Cant.</th>
              <th className="px-4 py-3 font-medium">Precio</th>
              <th className="px-4 py-3 font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {order.businesses.map((business) =>
              business.items.map((item, idx) => (
                <tr key={item.id} className="text-slate-700">
                  {idx === 0 && (
                    <td
                      className="px-4 py-3 font-medium text-slate-900"
                      rowSpan={business.items.length}
                    >
                      {business.businessName}
                    </td>
                  )}
                  <td className="px-4 py-3">{item.productName}</td>
                  <td className="px-4 py-3">{item.quantity}</td>
                  <td className="px-4 py-3">{item.unitPrice} CUP</td>
                  <td className="px-4 py-3">{item.subtotal} CUP</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:max-w-sm sm:self-end">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Resumen</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Subtotal</dt>
            <dd className="font-medium text-slate-900">{order.productsTotal} CUP</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Mensajería</dt>
            <dd className="font-medium text-slate-900">{order.deliveryFee} CUP</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Mensajería — parte de Tráelo</dt>
            <dd className="font-medium text-slate-900">{order.traeloDeliveryShare} CUP</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Servicio Tráelo</dt>
            <dd className="font-medium text-slate-900">{order.platformFee} CUP</dd>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-2 text-base">
            <dt className="font-semibold text-slate-900">Total</dt>
            <dd className="font-semibold text-slate-900">{order.total} CUP</dd>
          </div>
          {currentUser?.role === 'DELIVERER' && (
            <div className="flex justify-between pt-1 text-brand-700">
              <dt className="font-medium">Tu parte de mensajería</dt>
              <dd className="font-medium">{order.delivererEarning} CUP</dd>
            </div>
          )}
        </dl>
      </div>

      {completeOpen && (
        <ConfirmDialog
          title="Completar pedido"
          description="Se marcará como entregado y podrá incluirse en el próximo cuadre del mensajero. ¿Confirmás?"
          confirmLabel="Completar"
          variant="primary"
          isLoading={isUpdatingStatus}
          onConfirm={handleComplete}
          onCancel={() => setCompleteOpen(false)}
        />
      )}
      {cancelOpen && (
        <ConfirmDialog
          title="Cancelar pedido"
          description="El pedido quedará cancelado y no podrá reactivarse. ¿Confirmás?"
          confirmLabel="Cancelar pedido"
          isLoading={isUpdatingStatus}
          onConfirm={handleCancel}
          onCancel={() => setCancelOpen(false)}
        />
      )}
      {deleteOpen && (
        <ConfirmDialog
          title="Eliminar pedido"
          description={`El pedido #${order.orderNumber} de ${order.customerName} se va a eliminar para siempre. ¿Confirmás?`}
          confirmLabel="Eliminar"
          isLoading={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteOpen(false)}
        />
      )}
    </div>
  );
}
