import { useState } from 'react';
import clsx from 'clsx';
import { Badge } from '@/components/ui/Badge';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/ToastProvider';
import { formatDate } from '@/lib/formatDate';
import { HoursTab } from '@/features/businesses/HoursTab';
import { ProductsTab } from '@/features/businesses/ProductsTab';
import {
  useSetAcceptingOrdersMutation,
  useUploadBusinessLogoMutation,
} from '@/features/businesses/businessesApi';
import { useGetMyBusinessQuery } from './portalApi';

type Tab = 'info' | 'hours' | 'products';

const TABS: { key: Tab; label: string }[] = [
  { key: 'info', label: 'Mi negocio' },
  { key: 'hours', label: 'Horarios' },
  { key: 'products', label: 'Productos' },
];

export function MyBusinessPage() {
  const [tab, setTab] = useState<Tab>('info');
  const { showToast } = useToast();
  const { data, isLoading, error } = useGetMyBusinessQuery();
  const [uploadLogo] = useUploadBusinessLogoMutation();
  const [setAcceptingOrders, { isLoading: isToggling }] = useSetAcceptingOrdersMutation();

  if (isLoading) {
    return <p className="text-slate-400">Cargando…</p>;
  }
  if (error || !data) {
    return (
      <p className="text-red-600">
        No se pudo cargar tu negocio. Avisale a Tráelo para que revise que tu cuenta tenga un
        negocio asignado.
      </p>
    );
  }

  const business = data.data;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{business.name}</h1>
        <Badge tone={business.acceptingOrders ? 'green' : 'amber'}>
          {business.acceptingOrders ? 'Recibiendo pedidos' : 'Pausado'}
        </Badge>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={clsx(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Logo y disponibilidad</h2>
            <div className="flex gap-4">
              <ImageUploader
                currentImageUrl={business.logoUrl}
                onUpload={(file) => uploadLogo({ id: business.id, file }).unwrap()}
                successMessage="Logo actualizado"
              />
              <div className="flex flex-1 flex-col justify-center gap-2 text-sm">
                <Switch
                  checked={business.acceptingOrders}
                  label="Acepta pedidos"
                  onChange={(value) =>
                    setAcceptingOrders({ id: business.id, acceptingOrders: value }).then((res) => {
                      if ('error' in res) {
                        showToast('No se pudo actualizar', 'error');
                      } else {
                        showToast(value ? 'Ahora aceptás pedidos' : 'Pausaste los pedidos');
                      }
                    })
                  }
                />
                <p className="text-xs text-slate-400">
                  Pausalo cuando no puedas atender (se agotó todo, imprevisto, etc.).
                </p>
                {isToggling && <p className="text-xs text-slate-400">Actualizando…</p>}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Datos del negocio</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Teléfono</dt>
                <dd className="text-right font-medium text-slate-900">{business.phone}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Dirección</dt>
                <dd className="text-right font-medium text-slate-900">{business.address}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Con Tráelo desde</dt>
                <dd className="text-right font-medium text-slate-900">{formatDate(business.joinedAt)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-slate-400">
              Para cambiar el nombre, teléfono o dirección, escribile a Tráelo.
            </p>
          </div>
        </div>
      )}

      {tab === 'hours' && <HoursTab businessId={business.id} canManage />}
      {tab === 'products' && <ProductsTab business={{ id: business.id }} canManage ownerMode />}
    </div>
  );
}
