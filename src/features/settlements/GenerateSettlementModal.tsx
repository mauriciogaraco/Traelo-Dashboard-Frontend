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

// El negocio opera en Cuba: el campo de fecha se precarga con el día de hoy en La Habana (no
// vacío) para que siempre quede claro qué día se va a usar, en vez de depender de que quede en
// blanco — un campo vacío o mal tecleado fue justo lo que causó un cuadre con la fecha equivocada.
function getTodayHavanaDateString(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Havana' }).format(new Date());
}

export function GenerateSettlementModal({ onClose, onGenerated }: GenerateSettlementModalProps) {
  const [delivererId, setDelivererId] = useState<string | null>(null);
  const [type, setType] = useState<SettlementType>('DAILY');
  const [date, setDate] = useState(getTodayHavanaDateString);

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
          <label className="text-sm font-medium text-slate-700">Fecha de referencia</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            autoComplete="off"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <p className="text-xs text-slate-400">
            {type === 'DAILY'
              ? 'Ya viene puesta en el día de hoy. Cambiala solo si querés generar el cuadre de otro día.'
              : 'Ya viene puesta en hoy — se usa la semana (lunes a domingo) que contiene esa fecha. Cambiala solo si querés otra semana.'}
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
