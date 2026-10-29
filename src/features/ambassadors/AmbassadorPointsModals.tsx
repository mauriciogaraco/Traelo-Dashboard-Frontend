import { useState } from 'react';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime } from '@/lib/formatDate';
import { getErrorMessage } from '@/lib/getErrorMessage';
import {
  useAdjustAmbassadorPointsMutation,
  useGetAmbassadorQuery,
  type AmbassadorDTO,
  type AmbassadorTransactionDTO,
} from './ambassadorsApi';

const TYPE_LABEL: Record<AmbassadorTransactionDTO['type'], string> = {
  AMBASSADOR_MILESTONE: 'Bono por referidos',
  AMBASSADOR_SPECIAL: 'Puntos por pedido',
  AMBASSADOR_ADJUSTMENT: 'Ajuste del equipo',
};

/** Acreditar o retirar puntos de un embajador, con motivo (queda en su historial). */
export function AdjustPointsModal({ ambassador, onClose }: { ambassador: AmbassadorDTO; onClose: () => void }) {
  const [adjust, { isLoading, error }] = useAdjustAmbassadorPointsMutation();
  const [mode, setMode] = useState<'add' | 'remove'>('remove');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = Math.trunc(Number(amount));
    if (!(value > 0)) {
      setFormError('Pon una cantidad de puntos mayor que 0.');
      return;
    }
    if (mode === 'remove' && value > ambassador.pointsBalance) {
      setFormError(`No puedes retirar más de lo que tiene (${ambassador.pointsBalance} puntos).`);
      return;
    }
    if (!reason.trim()) {
      setFormError('Escribe el motivo: queda en su historial.');
      return;
    }
    setFormError(null);
    try {
      await adjust({
        customerId: ambassador.customerId,
        points: mode === 'add' ? value : -value,
        reason: reason.trim(),
      }).unwrap();
      onClose();
    } catch {
      /* el mensaje sale de `error` */
    }
  }

  return (
    <Modal title={`Ajustar puntos · ${ambassador.name}`} onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <p className="text-sm text-slate-500">
          Saldo actual: <span className="font-semibold text-slate-900">{ambassador.pointsBalance} puntos</span>. Retira
          los puntos que ya no corresponden o acredita los que faltan.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['remove', 'Retirar'],
              ['add', 'Acreditar'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={clsx(
                'rounded-lg border px-3 py-2 text-sm font-medium',
                mode === value
                  ? value === 'remove'
                    ? 'border-red-400 bg-red-50 text-red-700'
                    : 'border-green-500 bg-green-50 text-green-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <FormField
          label="Puntos"
          type="number"
          inputMode="numeric"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <FormField
          label="Motivo"
          maxLength={200}
          placeholder="Ej. Canje de 300 puntos en tienda"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {(formError || error) && (
          <p className="text-sm text-red-600">{formError ?? getErrorMessage(error!)}</p>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant={mode === 'remove' ? 'danger' : 'primary'} isLoading={isLoading}>
            {mode === 'remove' ? 'Retirar puntos' : 'Acreditar puntos'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Movimientos de puntos del embajador: bonos, puntos por pedido y ajustes. */
export function AmbassadorHistoryModal({ ambassador, onClose }: { ambassador: AmbassadorDTO; onClose: () => void }) {
  const { data, isLoading } = useGetAmbassadorQuery(ambassador.customerId);
  const transactions = data?.data.transactions ?? [];

  return (
    <Modal title={`Historial · ${ambassador.name}`} onClose={onClose} widthClassName="max-w-lg">
      {isLoading ? (
        <p className="text-slate-400">Cargando…</p>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-slate-500">Todavía no tiene bonos ni ajustes.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-slate-100">
          {transactions.map((t) => (
            <li key={t.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0 text-sm">
                <p className="font-medium text-slate-900">{TYPE_LABEL[t.type]}</p>
                <p className="text-xs text-slate-500">{t.reason}</p>
                <p className="text-xs text-slate-400">{formatDateTime(t.createdAt)}</p>
              </div>
              <span
                className={clsx(
                  'shrink-0 text-sm font-semibold',
                  t.points >= 0 ? 'text-green-700' : 'text-red-600',
                )}
              >
                {t.points >= 0 ? '+' : ''}
                {t.points}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}
