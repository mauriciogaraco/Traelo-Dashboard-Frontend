import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';
import { SUBSCRIPTION_CYCLE_LABEL, SUBSCRIPTION_STATUS_LABEL } from '@/lib/labels';
import type { BusinessSubscriptionDTO, SubscriptionStatus } from '@/lib/types';
import { CreateSubscriptionModal } from './CreateSubscriptionModal';
import { RenewSubscriptionModal } from './RenewSubscriptionModal';
import { useListSubscriptionsQuery, useUpdateSubscriptionMutation } from './businessesApi';

const STATUS_TONE: Record<SubscriptionStatus, 'green' | 'amber' | 'slate'> = {
  ACTIVE: 'green',
  EXPIRED: 'amber',
  CANCELLED: 'slate',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface SubscriptionsTabProps {
  businessId: string;
}

export function SubscriptionsTab({ businessId }: SubscriptionsTabProps) {
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [renewingSubscription, setRenewingSubscription] =
    useState<BusinessSubscriptionDTO | null>(null);
  const [cancellingSubscription, setCancellingSubscription] =
    useState<BusinessSubscriptionDTO | null>(null);

  const { data, isLoading } = useListSubscriptionsQuery({ businessId, page, pageSize: 10 });
  const [cancelSubscription, { isLoading: isCancelling }] = useUpdateSubscriptionMutation();

  async function handleConfirmCancel() {
    if (!cancellingSubscription) return;
    await cancelSubscription({
      businessId,
      subId: cancellingSubscription.id,
      body: { status: 'CANCELLED' },
    }).unwrap();
    setCancellingSubscription(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Nueva suscripción
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Ciclo</th>
              <th className="px-4 py-3 font-medium">Precio</th>
              <th className="px-4 py-3 font-medium">Inicio</th>
              <th className="px-4 py-3 font-medium">Fin</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && (data?.data.length ?? 0) === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Este negocio todavía no tiene suscripciones.
                </td>
              </tr>
            )}
            {data?.data.map((sub) => (
              <tr key={sub.id} className="text-slate-700">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {SUBSCRIPTION_CYCLE_LABEL[sub.cycle]}
                </td>
                <td className="px-4 py-3">{sub.price} CUP</td>
                <td className="px-4 py-3">{formatDate(sub.startDate)}</td>
                <td className="px-4 py-3">{formatDate(sub.endDate)}</td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONE[sub.status]}>{SUBSCRIPTION_STATUS_LABEL[sub.status]}</Badge>
                </td>
                <td className="px-4 py-3">
                  {sub.status === 'ACTIVE' && (
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="ghost" onClick={() => setRenewingSubscription(sub)}>
                        Renovar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setCancellingSubscription(sub)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </div>

      {createOpen && (
        <CreateSubscriptionModal businessId={businessId} onClose={() => setCreateOpen(false)} />
      )}
      {renewingSubscription && (
        <RenewSubscriptionModal
          businessId={businessId}
          subscription={renewingSubscription}
          onClose={() => setRenewingSubscription(null)}
        />
      )}
      {cancellingSubscription && (
        <ConfirmDialog
          title="Cancelar suscripción"
          description="El negocio quedará sin suscripción activa hasta que se cree una nueva. ¿Confirmás?"
          confirmLabel="Cancelar suscripción"
          isLoading={isCancelling}
          onConfirm={handleConfirmCancel}
          onCancel={() => setCancellingSubscription(null)}
        />
      )}
    </div>
  );
}
