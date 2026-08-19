import { Modal } from '@/components/ui/Modal';
import type { DateRangePreset } from '@/lib/types';
import { useGetDelivererSalesDetailQuery } from './reportsApi';

function formatCUP(value: number): string {
  return `${value.toLocaleString('es')} CUP`;
}

interface DelivererDetailModalProps {
  delivererId: string;
  delivererName: string;
  range: Exclude<DateRangePreset, 'custom'>;
  onClose: () => void;
}

export function DelivererDetailModal({
  delivererId,
  delivererName,
  range,
  onClose,
}: DelivererDetailModalProps) {
  const { data, isLoading } = useGetDelivererSalesDetailQuery({ delivererId, range });
  const detail = data?.data;
  const averagePerDelivery =
    detail && detail.deliveryCount > 0 ? detail.totalEarnings / detail.deliveryCount : 0;

  return (
    <Modal title={delivererName} onClose={onClose}>
      {isLoading && <p className="text-sm text-slate-400">Cargando…</p>}

      {detail && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Entregas completadas</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{detail.deliveryCount}</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Ganancias</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {formatCUP(detail.totalEarnings)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Servicio Tráelo</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {formatCUP(detail.platformFeeCollected)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Promedio por entrega</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {formatCUP(averagePerDelivery)}
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
