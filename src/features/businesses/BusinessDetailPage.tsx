import { useState } from 'react';
import { ArrowLeft, RotateCcw, UserX } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/ToastProvider';
import clsx from 'clsx';
import { COMMISSION_TYPE_LABEL, SUBSCRIPTION_STATUS_LABEL } from '@/lib/labels';
import { EditBusinessModal } from './EditBusinessModal';
import { HoursTab } from './HoursTab';
import { ProductsTab } from './ProductsTab';
import { SubscriptionsTab } from './SubscriptionsTab';
import {
  useDeactivateBusinessMutation,
  useGetBusinessQuery,
  useSetAcceptingOrdersMutation,
  useUpdateBusinessMutation,
  useUploadBusinessLogoMutation,
} from './businessesApi';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { year: 'numeric', month: 'short', day: 'numeric' });
}

type Tab = 'info' | 'hours' | 'products' | 'subscriptions';

export function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useAppSelector((state) => state.auth.user);
  const canManage = currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN';

  const [tab, setTab] = useState<Tab>('info');
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const { showToast } = useToast();
  const { data, isLoading, error } = useGetBusinessQuery(id ?? '', { skip: !id });
  const [reactivateBusiness] = useUpdateBusinessMutation();
  const [deactivateBusiness, { isLoading: isDeactivating }] = useDeactivateBusinessMutation();
  const [uploadLogo] = useUploadBusinessLogoMutation();
  const [setAcceptingOrders, { isLoading: isTogglingAccepting }] = useSetAcceptingOrdersMutation();

  if (isLoading) {
    return <p className="text-slate-400">Cargando…</p>;
  }

  if (error || !data) {
    return <p className="text-red-600">No se pudo cargar el negocio.</p>;
  }

  const business = data.data;

  async function handleConfirmDeactivate() {
    await deactivateBusiness(business.id).unwrap();
    setDeactivateOpen(false);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: 'Información' },
    { key: 'hours', label: 'Horarios' },
    { key: 'products', label: 'Productos' },
    ...(canManage ? [{ key: 'subscriptions' as Tab, label: 'Suscripciones' }] : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/businesses"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Negocios
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">{business.name}</h1>
            <Badge tone={business.active ? 'green' : 'slate'}>
              {business.active ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {business.phone} · {business.address}
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
              Editar
            </Button>
            {business.active ? (
              <Button type="button" variant="secondary" onClick={() => setDeactivateOpen(true)}>
                <UserX className="h-4 w-4" />
                Desactivar
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => reactivateBusiness({ id: business.id, body: { active: true } })}
              >
                <RotateCcw className="h-4 w-4" />
                Activar
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
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
          {canManage && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Negocio</h2>
              <div className="flex gap-4">
                <ImageUploader
                  currentImageUrl={business.logoUrl}
                  onUpload={(file) => uploadLogo({ id: business.id, file }).unwrap()}
                  successMessage="Logo actualizado"
                />
                <dl className="flex flex-1 flex-col justify-center gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Acepta pedidos</dt>
                    <dd>
                      <Switch
                        checked={business.acceptingOrders}
                        onChange={(value) =>
                          setAcceptingOrders({ id: business.id, acceptingOrders: value }).then(
                            (res) => {
                              if ('error' in res) {
                                showToast('No se pudo actualizar', 'error');
                              } else {
                                showToast(
                                  value ? 'Ahora acepta pedidos' : 'Dejó de aceptar pedidos',
                                );
                              }
                            },
                          )
                        }
                      />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Tarifa de envío base</dt>
                    <dd className="font-medium text-slate-900">{business.deliveryFeeBase} CUP</dd>
                  </div>
                </dl>
              </div>
              {isTogglingAccepting && <p className="mt-2 text-xs text-slate-400">Actualizando…</p>}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Comisión</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Modelo</dt>
                <dd className="font-medium text-slate-900">
                  {COMMISSION_TYPE_LABEL[business.commissionType]}
                </dd>
              </div>
              {business.commissionType === 'PERCENTAGE' ? (
                <div className="flex justify-between">
                  <dt className="text-slate-500">% sobre ventas</dt>
                  <dd className="font-medium text-slate-900">{business.commissionPercentage}%</dd>
                </div>
              ) : (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Monto por defecto</dt>
                  <dd className="font-medium text-slate-900">
                    {business.defaultProductCommissionAmount} CUP
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500">Ingresó</dt>
                <dd className="font-medium text-slate-900">{formatDate(business.joinedAt)}</dd>
              </div>
            </dl>
          </div>

          {canManage && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Suscripción actual</h2>
              {business.currentSubscription ? (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Estado</dt>
                    <dd>
                      <Badge
                        tone={
                          business.currentSubscription.status === 'ACTIVE'
                            ? 'green'
                            : business.currentSubscription.status === 'EXPIRED'
                              ? 'amber'
                              : 'slate'
                        }
                      >
                        {SUBSCRIPTION_STATUS_LABEL[business.currentSubscription.status]}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Vence</dt>
                    <dd className="font-medium text-slate-900">
                      {formatDate(business.currentSubscription.endDate)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Precio</dt>
                    <dd className="font-medium text-slate-900">
                      {business.currentSubscription.price} CUP
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-slate-400">Sin suscripción activa.</p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'hours' && <HoursTab businessId={business.id} canManage={canManage} />}
      {tab === 'products' && <ProductsTab business={business} canManage={canManage} />}
      {tab === 'subscriptions' && canManage && <SubscriptionsTab businessId={business.id} />}

      {editOpen && <EditBusinessModal business={business} onClose={() => setEditOpen(false)} />}
      {deactivateOpen && (
        <ConfirmDialog
          title="Desactivar negocio"
          description={`${business.name} dejará de estar disponible para nuevos pedidos. ¿Confirmás?`}
          confirmLabel="Desactivar"
          isLoading={isDeactivating}
          onConfirm={handleConfirmDeactivate}
          onCancel={() => setDeactivateOpen(false)}
        />
      )}
    </div>
  );
}
