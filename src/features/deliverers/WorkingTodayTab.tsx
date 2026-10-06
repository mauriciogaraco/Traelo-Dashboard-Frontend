import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Radio, Moon, UserMinus, UserPlus } from 'lucide-react';
import { useAppSelector } from '@/app/hooks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastProvider';
import { getErrorMessage } from '@/lib/getErrorMessage';
import type { DelivererDTO } from '@/lib/types';
import { useListDeliverersQuery, useSetDelivererDutyMutation } from './deliverersApi';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

export function WorkingTodayTab() {
  const role = useAppSelector((state) => state.auth.user?.role);
  // El backend autoriza PATCH /deliverers/:id/duty a OWNER/ADMIN/EMPLOYEE.
  const canToggle = role === 'OWNER' || role === 'ADMIN' || role === 'EMPLOYEE';
  const { showToast } = useToast();
  const [setDuty, { isLoading: isSettingDuty }] = useSetDelivererDutyMutation();
  const [confirmOff, setConfirmOff] = useState<DelivererDTO | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function changeDuty(deliverer: DelivererDTO, onDuty: boolean) {
    setBusyId(deliverer.id);
    try {
      await setDuty({ id: deliverer.id, onDuty }).unwrap();
      showToast(`${deliverer.name} ahora está ${onDuty ? 'activo' : 'inactivo'}.`);
      setConfirmOff(null);
    } catch (error) {
      showToast(getErrorMessage(error as Parameters<typeof getErrorMessage>[0]), 'error');
    } finally {
      setBusyId(null);
    }
  }

  // Mismo truco que el filtro "Inactivos" de la pestaña Listado: se trae una página grande y se
  // separa en el cliente. En la práctica nunca hay más de un puñado de mensajeros en línea a la
  // vez, así que no hace falta paginar esta vista.
  const { data, isLoading, isFetching } = useListDeliverersQuery({ active: true, pageSize: 100 });

  const { onDuty, offDuty } = useMemo(() => {
    const rows = data?.data ?? [];
    const onDutyRows = [...rows.filter((d) => d.onDuty)].sort((a, b) =>
      (a.queuedAt ?? a.joinedAt).localeCompare(b.queuedAt ?? b.joinedAt),
    );
    const offDutyRows = [...rows.filter((d) => !d.onDuty)].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    return { onDuty: onDutyRows, offDuty: offDutyRows };
  }, [data]);

  if (isLoading) {
    return <p className="px-4 py-10 text-center text-sm text-slate-400">Cargando…</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Radio className="h-4 w-4 text-green-600" />
          <h2 className="text-sm font-semibold text-slate-700">En rotación hoy</h2>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
            {onDuty.length}
          </span>
        </div>

        {onDuty.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
            Ningún mensajero se ha puesto en línea todavía hoy.
          </p>
        ) : (
          <ol className="flex flex-col">
            {onDuty.map((deliverer, index) => (
              <li key={deliverer.id} className="relative flex items-stretch">
                {/* tronco: une este nodo con el siguiente */}
                {index < onDuty.length - 1 && (
                  <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-slate-200" aria-hidden />
                )}
                <div className="flex flex-col items-center pb-5">
                  <span
                    className={clsx(
                      'relative z-10 flex h-10 w-10 flex-none items-center justify-center rounded-full border-2 text-sm font-bold shadow-sm',
                      index === 0
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-green-300 bg-white text-green-700',
                    )}
                  >
                    {index + 1}
                  </span>
                </div>
                {/* rama: conecta el nodo numerado con la tarjeta del mensajero */}
                <div className="mt-5 h-0.5 w-5 flex-none bg-slate-200" aria-hidden />
                <div className="mb-5 flex flex-1 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div>
                    <p className="font-medium text-slate-900">{deliverer.name}</p>
                    <p className="text-xs text-slate-400">
                      {deliverer.queuedAt
                        ? `En línea desde las ${formatTime(deliverer.queuedAt)}`
                        : 'En línea'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {index === 0 && <Badge tone="brand">Próximo turno</Badge>}
                    <Badge tone="green">En turno</Badge>
                    {canToggle && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-3 py-1.5"
                        disabled={busyId === deliverer.id}
                        onClick={() => setConfirmOff(deliverer)}
                      >
                        <UserMinus className="h-4 w-4" />
                        Poner inactivo
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Moon className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Fuera de turno</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
            {offDuty.length}
          </span>
        </div>

        {offDuty.length === 0 ? (
          <p className="text-sm text-slate-400">Todos los mensajeros activos están en turno.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {offDuty.map((deliverer) => (
              <div
                key={deliverer.id}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500"
              >
                <span className="h-2 w-2 flex-none rounded-full bg-slate-300" />
                {deliverer.name}
                <Badge tone="slate">Inactivo</Badge>
                {canToggle && (
                  <button
                    type="button"
                    disabled={busyId === deliverer.id}
                    onClick={() => void changeDuty(deliverer, true)}
                    className="flex items-center gap-1 rounded-full border border-green-200 bg-white px-2.5 py-0.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Poner activo
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      {isFetching && !isLoading && <p className="text-xs text-slate-400">Actualizando…</p>}

      {confirmOff && (
        <ConfirmDialog
          title="Poner inactivo"
          description={`${confirmOff.name} dejará de recibir pedidos nuevos y saldrá de la rotación de hoy. Para volver tendrá que ponerse activo otra vez.`}
          confirmLabel="Poner inactivo"
          isLoading={isSettingDuty}
          onConfirm={() => void changeDuty(confirmOff, false)}
          onCancel={() => setConfirmOff(null)}
        />
      )}
    </div>
  );
}
