import { useState } from 'react';
import type { SerializedError } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/ToastProvider';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { DAY_OF_WEEK_DISPLAY_ORDER, DAY_OF_WEEK_LABEL } from '@/lib/labels';
import type { BusinessHoursDTO } from '@/lib/types';
import { CreateClosureModal } from './CreateClosureModal';
import { EditDayHoursModal } from './EditDayHoursModal';
import {
  useDeleteBusinessClosureMutation,
  useDeleteBusinessHoursMutation,
  useListBusinessClosuresQuery,
  useListBusinessHoursQuery,
  useUpsertBusinessHoursMutation,
} from './businessesApi';

interface HoursTabProps {
  businessId: string;
  canManage: boolean;
}

function formatClosureDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    timeZone: 'America/Havana',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function HoursTab({ businessId, canManage }: HoursTabProps) {
  const { showToast } = useToast();
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [resettingDay, setResettingDay] = useState<number | null>(null);
  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [generalOpenTime, setGeneralOpenTime] = useState('09:00');
  const [generalCloseTime, setGeneralCloseTime] = useState('22:00');

  const { data: hoursData, isLoading: isLoadingHours } = useListBusinessHoursQuery(businessId);
  const { data: closuresData, isLoading: isLoadingClosures } = useListBusinessClosuresQuery({
    businessId,
    upcoming: true,
  });
  const [upsertHours, { isLoading: isApplyingAll }] = useUpsertBusinessHoursMutation();
  const [deleteClosure] = useDeleteBusinessClosureMutation();
  const [deleteHours, { isLoading: isResetting }] = useDeleteBusinessHoursMutation();

  const hoursByDay = new Map<number, BusinessHoursDTO>(
    (hoursData?.data ?? []).map((h) => [h.dayOfWeek, h]),
  );

  async function handleApplyToAllDays() {
    if (generalOpenTime >= generalCloseTime) {
      showToast('La apertura debe ser anterior al cierre', 'error');
      return;
    }
    try {
      await Promise.all(
        DAY_OF_WEEK_DISPLAY_ORDER.map((dayOfWeek) =>
          upsertHours({
            businessId,
            dayOfWeek,
            openTime: generalOpenTime,
            closeTime: generalCloseTime,
            closed: false,
          }).unwrap(),
        ),
      );
      showToast('Horario aplicado a los 7 días');
    } catch (error) {
      showToast(getErrorMessage(error as FetchBaseQueryError | SerializedError), 'error');
    }
  }

  async function handleConfirmReset() {
    if (resettingDay === null) return;
    try {
      await deleteHours({ businessId, dayOfWeek: resettingDay }).unwrap();
      setResettingDay(null);
    } catch (error) {
      showToast(getErrorMessage(error as FetchBaseQueryError | SerializedError), 'error');
    }
  }

  async function handleDeleteClosure(closureId: string) {
    await deleteClosure({ businessId, closureId }).unwrap();
  }

  return (
    <div className="flex flex-col gap-6">
      {canManage && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Horario general</h2>
          <p className="mb-3 text-sm text-slate-500">
            Aplicá el mismo horario a los 7 días y después ajustá algún día puntual si hace falta.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <FormField
              label="Apertura"
              type="time"
              value={generalOpenTime}
              onChange={(e) => setGeneralOpenTime(e.target.value)}
            />
            <FormField
              label="Cierre"
              type="time"
              value={generalCloseTime}
              onChange={(e) => setGeneralCloseTime(e.target.value)}
            />
            <Button type="button" isLoading={isApplyingAll} onClick={handleApplyToAllDays}>
              Aplicar a todos los días
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Día</th>
              <th className="px-4 py-3 font-medium">Horario</th>
              {canManage && <th className="px-4 py-3 font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoadingHours && (
              <tr>
                <td colSpan={canManage ? 3 : 2} className="px-4 py-8 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoadingHours &&
              DAY_OF_WEEK_DISPLAY_ORDER.map((dayOfWeek) => {
                const current = hoursByDay.get(dayOfWeek);
                return (
                  <tr key={dayOfWeek} className="text-slate-700">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {DAY_OF_WEEK_LABEL[dayOfWeek]}
                    </td>
                    <td className="px-4 py-3">
                      {!current ? (
                        <span className="text-slate-400">Sin configurar</span>
                      ) : current.closed ? (
                        <span className="text-slate-500">Cerrado</span>
                      ) : (
                        `${current.openTime} – ${current.closeTime}`
                      )}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setEditingDay(dayOfWeek)}
                        >
                          Editar
                        </Button>
                        {current && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setResettingDay(dayOfWeek)}
                          >
                            Quitar
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Cierres excepcionales</h2>
            <p className="text-sm text-slate-500">
              Días puntuales en los que el negocio no abre (feriados, mantenimiento, etc.).
            </p>
          </div>
          {canManage && (
            <Button type="button" variant="secondary" onClick={() => setClosureModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          )}
        </div>

        {isLoadingClosures && <p className="text-sm text-slate-400">Cargando…</p>}
        {!isLoadingClosures && (closuresData?.data.length ?? 0) === 0 && (
          <p className="text-sm text-slate-400">No hay cierres próximos programados.</p>
        )}
        {!isLoadingClosures && (closuresData?.data.length ?? 0) > 0 && (
          <ul className="divide-y divide-slate-100">
            {closuresData!.data.map((closure) => (
              <li key={closure.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <span className="font-medium text-slate-900">
                    {formatClosureDate(closure.date)}
                  </span>
                  {closure.reason && <span className="ml-2 text-slate-500">{closure.reason}</span>}
                </span>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleDeleteClosure(closure.id)}
                    className="text-slate-400 hover:text-red-600"
                    aria-label="Eliminar cierre"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {editingDay !== null && (
        <EditDayHoursModal
          businessId={businessId}
          dayOfWeek={editingDay}
          current={hoursByDay.get(editingDay)}
          onClose={() => setEditingDay(null)}
        />
      )}
      {resettingDay !== null && (
        <ConfirmDialog
          title="Quitar horario"
          description={`Se elimina el horario configurado del ${DAY_OF_WEEK_LABEL[resettingDay].toLowerCase()} y el día queda "Sin configurar". ¿Confirmás?`}
          confirmLabel="Quitar"
          isLoading={isResetting}
          onConfirm={handleConfirmReset}
          onCancel={() => setResettingDay(null)}
        />
      )}
      {closureModalOpen && (
        <CreateClosureModal businessId={businessId} onClose={() => setClosureModalOpen(false)} />
      )}
    </div>
  );
}
