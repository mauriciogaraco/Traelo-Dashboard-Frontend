import { useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { SETTLEMENT_STATUS_LABEL, SETTLEMENT_TYPE_LABEL } from '@/lib/labels';
import { useCloseSettlementMutation, useGetSettlementOrdersQuery, useGetSettlementQuery } from './settlementsApi';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        highlight ? 'border-brand-200 bg-brand-50' : 'border-slate-200 bg-white'
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${highlight ? 'text-brand-700' : 'text-slate-900'}`}>
        {value}
      </p>
    </div>
  );
}

export function SettlementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useAppSelector((state) => state.auth.user);
  const canClose = currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN';

  const [closeOpen, setCloseOpen] = useState(false);

  const { data, isLoading, error } = useGetSettlementQuery(id ?? '', { skip: !id });
  const { data: ordersData, isLoading: isLoadingOrders } = useGetSettlementOrdersQuery(id ?? '', {
    skip: !id,
  });
  const [closeSettlement, { isLoading: isClosing, error: closeError }] = useCloseSettlementMutation();

  if (isLoading) {
    return <p className="text-slate-400">Cargando…</p>;
  }
  if (error || !data) {
    return <p className="text-red-600">No se pudo cargar el cuadre.</p>;
  }

  const settlement = data.data;
  const orders = ordersData?.data ?? [];

  async function handleClose() {
    if (!id) return;
    await closeSettlement(id).unwrap();
    setCloseOpen(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/settlements"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Cuadres
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">
              Cuadre {SETTLEMENT_TYPE_LABEL[settlement.type]} · {settlement.delivererName}
            </h1>
            <Badge tone={settlement.status === 'OPEN' ? 'amber' : 'green'}>
              {SETTLEMENT_STATUS_LABEL[settlement.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {formatDate(settlement.periodStart)} – {formatDate(settlement.periodEnd)}
          </p>
          {settlement.status === 'CLOSED' && (
            <p className="mt-1 text-sm text-slate-500">
              Cerrado por {settlement.closedByName} · {formatDateTime(settlement.closedAt)}
            </p>
          )}
        </div>
        {canClose && settlement.status === 'OPEN' && (
          <Button type="button" onClick={() => setCloseOpen(true)}>
            Cerrar cuadre
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Entregas" value={settlement.totalDeliveries} />
        <SummaryCard label="Recaudado" value={`${settlement.totalCollected} CUP`} />
        <SummaryCard label="Mensajería Tráelo" value={`${settlement.traeloDeliveryShare} CUP`} />
        <SummaryCard label="Parte del mensajero" value={`${settlement.delivererShare} CUP`} />
        <SummaryCard label="Servicio Tráelo" value={`${settlement.platformFeeCollected} CUP`} />
        <SummaryCard
          label="Total a entregar a Tráelo"
          value={`${settlement.totalToDeliver} CUP`}
          highlight
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Pedido</th>
              <th className="px-4 py-3 font-medium">Negocio(s)</th>
              <th className="px-4 py-3 font-medium">Completado</th>
              <th className="px-4 py-3 font-medium">Mensajería</th>
              <th className="px-4 py-3 font-medium">Servicio Tráelo</th>
              <th className="px-4 py-3 font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoadingOrders && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Cargando pedidos…
                </td>
              </tr>
            )}
            {!isLoadingOrders && orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Este cuadre no tiene pedidos.
                </td>
              </tr>
            )}
            {orders.map((order) => (
              <tr key={order.id} className="text-slate-700">
                <td className="px-4 py-3 font-medium text-slate-900">
                  <Link to={`/orders/${order.id}`} className="hover:underline">
                    #{order.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">{order.businessNames.join(', ')}</td>
                <td className="px-4 py-3">{formatDateTime(order.completedAt)}</td>
                <td className="px-4 py-3">{order.deliveryFee} CUP</td>
                <td className="px-4 py-3">{order.platformFee} CUP</td>
                <td className="px-4 py-3">{order.total} CUP</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {closeError && <p className="text-sm text-red-600">{getErrorMessage(closeError)}</p>}

      {closeOpen && (
        <ConfirmDialog
          title="Cerrar cuadre"
          description="Una vez cerrado, este cuadre no podrá regenerarse ni modificarse. ¿Confirmás?"
          confirmLabel="Cerrar cuadre"
          variant="primary"
          isLoading={isClosing}
          onConfirm={handleClose}
          onCancel={() => setCloseOpen(false)}
        />
      )}
    </div>
  );
}
