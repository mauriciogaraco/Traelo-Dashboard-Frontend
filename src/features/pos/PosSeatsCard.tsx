import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { useSetPosSeatsMutation, type PosBusinessDevicesDTO } from './posApi';

const MAX_SEATS = 100;

// Cuántos administradores y cuántas cajas puede tener activos el negocio. Sin tope fijo: lo decide el personal de Tráelo.
export function PosSeatsCard({
  businessId,
  seats,
  custom,
  hasSubscription,
}: {
  businessId: string;
  seats: PosBusinessDevicesDTO['seats'];
  custom: boolean;
  hasSubscription: boolean;
}) {
  const allowed = (role: 'admin' | 'cashier') => seats.find((s) => s.role === role)?.allowed ?? 0;
  const [admin, setAdmin] = useState(String(allowed('admin')));
  const [cashier, setCashier] = useState(String(allowed('cashier')));
  const [save, { isLoading }] = useSetPosSeatsMutation();
  const { showToast } = useToast();

  const adminN = Number(admin);
  const cashierN = Number(cashier);
  const valid =
    Number.isInteger(adminN) &&
    Number.isInteger(cashierN) &&
    adminN >= 0 &&
    cashierN >= 0 &&
    adminN <= MAX_SEATS &&
    cashierN <= MAX_SEATS &&
    adminN + cashierN >= 1;
  const changed = adminN !== allowed('admin') || cashierN !== allowed('cashier');

  const onSave = async () => {
    try {
      await save({ businessId, admin: adminN, cashier: cashierN }).unwrap();
      showToast('Cupo de dispositivos actualizado.');
    } catch (e) {
      showToast(getErrorMessage(e as Parameters<typeof getErrorMessage>[0]), 'error');
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Cupo de dispositivos</h2>
      <p className="mt-1 text-sm text-slate-500">
        Cuántos teléfonos o computadoras puede tener activos este negocio, por rol.{' '}
        {custom ? 'Cupo propio de este negocio.' : 'Ahora vale el del plan; al guardar queda un cupo propio.'} Bajarlo no
        desactiva los que ya están: solo impide dar de alta nuevos hasta que se libere un asiento.
      </p>
      {!hasSubscription ? (
        <p className="mt-3 text-sm text-amber-700">Este negocio no tiene suscripción: asígnale una para fijar su cupo.</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Administradores
            <input
              type="number"
              min={0}
              max={MAX_SEATS}
              value={admin}
              onChange={(e) => setAdmin(e.target.value)}
              className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Cajas
            <input
              type="number"
              min={0}
              max={MAX_SEATS}
              value={cashier}
              onChange={(e) => setCashier(e.target.value)}
              className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <Button type="button" onClick={onSave} isLoading={isLoading} disabled={!valid || !changed}>
            Guardar cupo
          </Button>
          {!valid && <p className="text-xs text-red-600">Entre 0 y {MAX_SEATS} de cada uno, y al menos un dispositivo en total.</p>}
        </div>
      )}
    </section>
  );
}
