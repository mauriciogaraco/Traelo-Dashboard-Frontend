import { useState } from 'react';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useListDeliverersQuery } from '@/features/deliverers/deliverersApi';
import { getErrorMessage } from '@/lib/getErrorMessage';
import type { SettlementType } from '@/lib/types';
import { useGenerateDailySettlementMutation, useGenerateWeeklySettlementMutation } from './settlementsApi';

interface GenerateSettlementModalProps {
  onClose: () => void;
  onGenerated: (settlementId: string) => void;
}

export function GenerateSettlementModal({ onClose, onGenerated }: GenerateSettlementModalProps) {
  const [delivererId, setDelivererId] = useState<string | null>(null);
  const [type, setType] = useState<SettlementType>('DAILY');
  const [date, setDate] = useState('');

  const { data: deliverersData } = useListDeliverersQuery({ pageSize: 100, active: true });
  const [generateDaily, { isLoading: isGeneratingDaily, error: dailyError }] =
    useGenerateDailySettlementMutation();
  const [generateWeekly, { isLoading: isGeneratingWeekly, error: weeklyError }] =
    useGenerateWeeklySettlementMutation();

  const isLoading = isGeneratingDaily || isGeneratingWeekly;
  const error = dailyError ?? weeklyError;

  const delivererOptions = (deliverersData?.data ?? []).map((d) => ({
    value: d.id,
    label: d.name,
    sublabel: d.phone ?? undefined,
  }));

  async function handleSubmit() {
    if (!delivererId) return;
    const body = { delivererId, date: date || undefined };
    const result =
      type === 'DAILY' ? await generateDaily(body).unwrap() : await generateWeekly(body).unwrap();
    onGenerated(result.data.id);
  }

  return (
    <Modal title="Generar cuadre" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <SearchableSelect
          label="Mensajero"
          value={delivererId}
          onChange={setDelivererId}
          options={delivererOptions}
          placeholder="Buscar mensajero…"
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Tipo de cuadre</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('DAILY')}
              className={clsx(
                'flex-1 rounded-lg border px-3 py-2 text-sm font-medium',
                type === 'DAILY'
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50',
              )}
            >
              Diario
            </button>
            <button
              type="button"
              onClick={() => setType('WEEKLY')}
              className={clsx(
                'flex-1 rounded-lg border px-3 py-2 text-sm font-medium',
                type === 'WEEKLY'
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50',
              )}
            >
              Semanal
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Fecha de referencia (opcional)</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="text-xs text-slate-400">
            {type === 'DAILY'
              ? 'Se usa el día de esta fecha. Si se deja vacío, se usa hoy.'
              : 'Se usa la semana (lunes a domingo) que contiene esta fecha. Si se deja vacío, se usa la semana actual.'}
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={!delivererId} isLoading={isLoading} onClick={handleSubmit}>
            Generar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
