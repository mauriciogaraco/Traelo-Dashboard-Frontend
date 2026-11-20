import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/ToastProvider';
import { formatDateTime } from '@/lib/formatDate';
import {
  useGetCashierPermissionsQuery,
  useSetCashierPermissionsMutation,
  type CashierPermissionsDTO,
} from './posApi';

// Todos los módulos de la app POS con un interruptor para el dispositivo de CAJA. El administrador siempre tiene todos y no
// es configurable. Los cambios llegan al teléfono de la caja con su próxima descarga (firmados por el servidor).
export function CashierPermissionsCard({ businessId }: { businessId: string }) {
  const { data, isLoading, isError } = useGetCashierPermissionsQuery(businessId);
  if (isLoading) return <p className="text-sm text-slate-400">Cargando permisos…</p>;
  if (isError || !data) {
    return <p className="text-sm text-red-600">No se pudieron cargar los permisos de la caja.</p>;
  }
  // `key` reinicia el borrador cuando llega una versión nueva del servidor.
  return (
    <PermissionsForm
      key={`${data.data.version ?? 'default'}`}
      businessId={businessId}
      current={data.data}
    />
  );
}

function PermissionsForm({
  businessId,
  current,
}: {
  businessId: string;
  current: CashierPermissionsDTO;
}) {
  const { showToast } = useToast();
  const [save, { isLoading: isSaving }] = useSetCashierPermissionsMutation();
  const saved = current.modules.filter((m) => m.enabled).map((m) => m.key);
  const [draft, setDraft] = useState<string[]>(saved);

  const dirty = draft.length !== saved.length || draft.some((k) => !saved.includes(k));
  const defaults = current.modules.filter((m) => m.cashierDefault).map((m) => m.key);
  const isAtDefaults =
    draft.length === defaults.length && draft.every((k) => defaults.includes(k));

  const toggle = (key: string, on: boolean) =>
    setDraft((d) => (on ? [...new Set([...d, key])] : d.filter((k) => k !== key)));

  const onSave = async () => {
    try {
      await save({ businessId, modules: draft }).unwrap();
      showToast('Permisos de la caja guardados. Llegarán al teléfono con su próxima descarga.');
    } catch {
      showToast('No se pudieron guardar los permisos', 'error');
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Módulos de la caja (por defecto)</h2>
          <p className="text-xs text-slate-500">
            {draft.length} de {current.modules.length} módulos activados para la caja
            {current.updatedAt
              ? ` · guardado ${formatDateTime(current.updatedAt)}`
              : ' · valores por defecto (nadie los ha cambiado)'}
          </p>
        </div>
        <p className="w-full text-xs text-slate-500">
          Los usan los cajeros que no tengan una lista propia (botón «Permisos» de cada usuario).
        </p>
        <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
          <ShieldCheck className="h-4 w-4" />
          Administrador: acceso a todo (no configurable)
        </div>
      </div>

      <ul className="divide-y divide-slate-100">
        {current.modules.map((m) => (
          <li key={m.key} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">
                {m.label}{' '}
                {m.cashierDefault && <Badge tone="slate">por defecto</Badge>}
              </p>
              <p className="text-xs text-slate-500">{m.description}</p>
            </div>
            <Switch checked={draft.includes(m.key)} onChange={(on) => toggle(m.key, on)} />
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={isAtDefaults || isSaving}
          onClick={() => setDraft(defaults)}
        >
          Valores por defecto
        </Button>
        <Button type="button" disabled={!dirty} isLoading={isSaving} onClick={onSave}>
          Guardar permisos
        </Button>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Siempre disponibles para la caja: Mi PIN y el estado de la licencia. Cerrar la sesión de
        un teléfono y cambiar de usuario no dependen de estos permisos.
      </p>
    </section>
  );
}
