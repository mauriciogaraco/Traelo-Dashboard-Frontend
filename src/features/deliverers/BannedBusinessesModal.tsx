import { useState } from 'react';
import { Ban } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useListBusinessesQuery } from '@/features/businesses/businessesApi';
import { formatDateTime } from '@/lib/formatDate';
import { getErrorMessage } from '@/lib/getErrorMessage';
import type { DelivererDTO } from '@/lib/types';
import {
  useBanDelivererFromBusinessMutation,
  useListDelivererBansQuery,
  useUnbanDelivererFromBusinessMutation,
} from './deliverersApi';

interface BannedBusinessesModalProps {
  deliverer: DelivererDTO;
  onClose: () => void;
}

/**
 * Negocios de los que un mensajero está vetado (solo OWNER/ADMIN). Con el veto, el despacho
 * automático le salta los pedidos de ese local y se los pasa al siguiente de la cola, pero el
 * mensajero no pierde su turno; tampoco se le puede asignar uno de ese local a mano.
 */
export function BannedBusinessesModal({ deliverer, onClose }: BannedBusinessesModalProps) {
  const { data, isLoading } = useListDelivererBansQuery(deliverer.id);
  const { data: businessesData } = useListBusinessesQuery({ active: true, pageSize: 100 });
  const [banBusiness, { isLoading: isBanning, error: banError }] =
    useBanDelivererFromBusinessMutation();
  const [unbanBusiness, { isLoading: isUnbanning, error: unbanError }] =
    useUnbanDelivererFromBusinessMutation();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const bans = data?.data ?? [];
  const bannedIds = new Set(bans.map((b) => b.businessId));
  const options = (businessesData?.data ?? [])
    .filter((b) => !bannedIds.has(b.id))
    .map((b) => ({ value: b.id, label: b.name }));

  async function handleBan() {
    if (!businessId) return;
    await banBusiness({ id: deliverer.id, businessId, reason: reason.trim() || undefined }).unwrap();
    setBusinessId(null);
    setReason('');
  }

  const error = banError ?? unbanError;

  return (
    <Modal title={`Negocios vetados · ${deliverer.name}`} onClose={onClose} widthClassName="max-w-lg">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-500">
          Un mensajero vetado de un negocio no recibe pedidos de ese local: se le pasan al siguiente
          de la cola y él no pierde su turno. Tampoco se le pueden asignar a mano.
        </p>

        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3">
          <SearchableSelect
            label="Vetar de un negocio"
            value={businessId}
            onChange={setBusinessId}
            options={options}
            placeholder="Buscar negocio…"
            allowClear={false}
          />
          <FormField
            label="Motivo (opcional)"
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex justify-end">
            <Button type="button" variant="danger" disabled={!businessId} isLoading={isBanning} onClick={handleBan}>
              <Ban className="h-4 w-4" />
              Vetar
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Vetado actualmente</h3>
          {isLoading && <p className="text-sm text-slate-400">Cargando…</p>}
          {!isLoading && bans.length === 0 && (
            <p className="text-sm text-slate-500">No está vetado de ningún negocio.</p>
          )}
          {bans.map((ban) => (
            <div
              key={ban.businessId}
              className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
            >
              <div className="text-sm">
                <p className="font-medium text-slate-900">{ban.businessName}</p>
                <p className="text-xs text-slate-500">
                  {formatDateTime(ban.createdAt)}
                  {ban.reason ? ` · ${ban.reason}` : ''}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                disabled={isUnbanning}
                onClick={() => unbanBusiness({ id: deliverer.id, businessId: ban.businessId })}
              >
                Quitar veto
              </Button>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
