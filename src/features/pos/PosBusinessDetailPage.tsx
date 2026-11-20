import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { formatDate, formatDateTime } from '@/lib/formatDate';
import { useGetPosBusinessDevicesQuery, type PosDeviceDTO } from './posApi';

const ROLE_LABEL: Record<PosDeviceDTO['role'], string> = {
  admin: 'Administrador',
  cashier: 'Caja',
};

const LICENSE_LABEL: Record<
  NonNullable<PosDeviceDTO['license']>['status'],
  { label: string; tone: 'green' | 'red' | 'amber' }
> = {
  active: { label: 'Activa', tone: 'green' },
  superseded: { label: 'Reemplazada', tone: 'amber' },
  revoked: { label: 'Revocada', tone: 'red' },
};

// Los «usuarios» de un negocio del POS en el servidor son sus dispositivos con rol firmado: el personal con PIN de cada
// teléfono vive solo en el teléfono y no se sincroniza.
export function PosBusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useGetPosBusinessDevicesQuery(id ?? '', { skip: !id });

  if (isLoading) return <p className="text-slate-400">Cargando…</p>;
  if (isError || !data) {
    return (
      <div className="flex flex-col gap-3">
        <Link to="/pos" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Sistema POS
        </Link>
        <p className="text-red-600">No se pudo cargar el negocio POS.</p>
      </div>
    );
  }

  const { business, seats, devices } = data.data;
  const now = Date.now();

  return (
    <div className="flex flex-col gap-4">
      <Link to="/pos" className="inline-flex w-fit items-center gap-1 text-sm text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Sistema POS
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{business.name}</h1>
        <Badge tone={business.status === 'active' ? 'green' : 'slate'}>
          {business.status === 'active' ? 'Activo' : 'Suspendido'}
        </Badge>
        {business.subscription && (
          <Badge tone={business.subscription.status === 'active' ? 'green' : 'red'}>
            Suscripción {business.subscription.status === 'active' ? 'activa' : business.subscription.status === 'expired' ? 'vencida' : 'cancelada'}{' '}
            hasta {formatDate(business.subscription.endsAt)}
          </Badge>
        )}
      </div>
      <p className="text-sm text-slate-500">
        {[business.cityName, business.phone, business.address].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {seats.map((s) => (
          <div key={s.role} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{ROLE_LABEL[s.role]}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {s.used}
              <span className="text-base font-normal text-slate-400"> / {s.allowed ?? '—'}</span>
            </p>
            <p className="text-xs text-slate-500">
              {s.allowed === null ? 'Sin suscripción: no hay asientos' : s.used >= s.allowed ? 'Asiento ocupado' : 'Asiento libre'}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Dispositivo</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Última conexión</th>
              <th className="px-4 py-3 font-medium">Licencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {devices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Este negocio todavía no tiene dispositivos dados de alta.
                </td>
              </tr>
            )}
            {devices.map((d) => {
              const lic = d.license ? LICENSE_LABEL[d.license.status] : null;
              const expired = d.license ? new Date(d.license.expiresAt).getTime() <= now : false;
              return (
                <tr key={d.deviceId} className="text-slate-700">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{d.name}</div>
                    <div className="text-xs text-slate-400" title={d.deviceId}>
                      {d.deviceId.slice(0, 8)}… · alta {formatDate(d.registeredAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={d.role === 'admin' ? 'brand' : 'slate'}>{ROLE_LABEL[d.role]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={d.status === 'active' ? 'green' : 'red'}>
                      {d.status === 'active' ? 'Activo' : 'Revocado'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{formatDateTime(d.lastSeenAt)}</td>
                  <td className="px-4 py-3">
                    {d.license && lic ? (
                      <div className="flex flex-col gap-1">
                        <Badge tone={lic.tone}>{lic.label}</Badge>
                        <span className="text-xs text-slate-500">
                          {expired ? 'venció' : 'vence'} {formatDate(d.license.expiresAt)}
                        </span>
                      </div>
                    ) : (
                      <Badge tone="slate">Sin activar</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">
        El personal con PIN (propietario, gerentes y cajeros) se gestiona en cada teléfono y no se sincroniza con el servidor.
      </p>
    </div>
  );
}
