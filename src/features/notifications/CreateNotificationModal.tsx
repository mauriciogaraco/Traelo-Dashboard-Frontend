import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Bell } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/ToastProvider';
import { getErrorMessage } from '@/lib/getErrorMessage';
import type { NotificationDestination } from '@/lib/types';
import { useListBusinessesQuery, useListProductsQuery } from '@/features/businesses/businessesApi';
import { useListCategoriesQuery } from '@/features/categories/categoriesApi';
import { useCreateNotificationMutation } from './notificationsApi';

const destinationTypeSchema = z.enum(['GENERAL', 'BUSINESS', 'PRODUCT', 'CATEGORY']);
type DestinationType = z.infer<typeof destinationTypeSchema>;

const DESTINATION_OPTIONS: { value: DestinationType; label: string }[] = [
  { value: 'GENERAL', label: 'General' },
  { value: 'BUSINESS', label: 'Negocio' },
  { value: 'PRODUCT', label: 'Producto' },
  { value: 'CATEGORY', label: 'Categoría' },
];

const schema = z
  .object({
    title: z.string().trim().min(2, 'Mínimo 2 caracteres').max(120, 'Máximo 120 caracteres'),
    body: z.string().trim().min(2, 'Mínimo 2 caracteres').max(500, 'Máximo 500 caracteres'),
    destinationType: destinationTypeSchema,
    businessId: z.string().nullable(),
    productId: z.string().nullable(),
    categoryId: z.string().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.destinationType === 'BUSINESS' && !data.businessId) {
      ctx.addIssue({ code: 'custom', path: ['businessId'], message: 'Elegí un negocio' });
    }
    if (data.destinationType === 'PRODUCT' && !data.productId) {
      ctx.addIssue({ code: 'custom', path: ['productId'], message: 'Elegí un producto' });
    }
    if (data.destinationType === 'CATEGORY' && !data.categoryId) {
      ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Elegí una categoría' });
    }
  });

type FormValues = z.infer<typeof schema>;

function buildDestination(values: FormValues): NotificationDestination {
  switch (values.destinationType) {
    case 'BUSINESS':
      return { type: 'BUSINESS', businessId: values.businessId! };
    case 'PRODUCT':
      return { type: 'PRODUCT', productId: values.productId! };
    case 'CATEGORY':
      return { type: 'CATEGORY', categoryId: values.categoryId! };
    default:
      return { type: 'GENERAL' };
  }
}

interface CreateNotificationModalProps {
  onClose: () => void;
}

export function CreateNotificationModal({ onClose }: CreateNotificationModalProps) {
  const { showToast } = useToast();
  const [confirming, setConfirming] = useState(false);
  // Solo para filtrar el selector de producto — no es un campo que se manda al backend.
  const [productBusinessId, setProductBusinessId] = useState<string | null>(null);

  const [createNotification, { isLoading, error }] = useCreateNotificationMutation();

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      body: '',
      destinationType: 'GENERAL',
      businessId: null,
      productId: null,
      categoryId: null,
    },
  });

  const destinationType = watch('destinationType');
  const title = watch('title');
  const body = watch('body');

  const { data: businessesData } = useListBusinessesQuery(
    { pageSize: 100, active: true },
    { skip: destinationType !== 'BUSINESS' && destinationType !== 'PRODUCT' },
  );
  const { data: categoriesData } = useListCategoriesQuery(
    { pageSize: 100, active: true },
    { skip: destinationType !== 'CATEGORY' },
  );
  const { data: productsData } = useListProductsQuery(
    { businessId: productBusinessId ?? '', pageSize: 100, active: true },
    { skip: destinationType !== 'PRODUCT' || !productBusinessId },
  );

  const businessOptions = useMemo(
    () => (businessesData?.data ?? []).map((b) => ({ value: b.id, label: b.name })),
    [businessesData],
  );
  const categoryOptions = useMemo(
    () => (categoriesData?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    [categoriesData],
  );
  const productOptions = useMemo(
    () => (productsData?.data ?? []).map((p) => ({ value: p.id, label: p.name })),
    [productsData],
  );

  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);

  function onSubmit(values: FormValues) {
    setPendingValues(values);
    setConfirming(true);
  }

  async function handleConfirmSend() {
    if (!pendingValues) return;
    try {
      await createNotification({
        title: pendingValues.title,
        body: pendingValues.body,
        audience: { type: 'ALL_CUSTOMERS' },
        data: buildDestination(pendingValues),
      }).unwrap();
      showToast('Difusión enviada');
      onClose();
    } catch {
      showToast('No se pudo enviar la difusión', 'error');
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <ConfirmDialog
        title="Enviar difusión"
        description="¿Enviar esta notificación a todos los clientes? Una vez enviada no se puede deshacer."
        confirmLabel="Enviar"
        variant="primary"
        isLoading={isLoading}
        onConfirm={handleConfirmSend}
        onCancel={() => setConfirming(false)}
      />
    );
  }

  return (
    <Modal title="Nueva notificación" onClose={onClose} widthClassName="max-w-lg">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField
          label="Título"
          placeholder="Ej. 🔥 Rebaja de precios"
          maxLength={120}
          error={errors.title?.message}
          {...register('title')}
        />
        <Textarea
          label="Mensaje"
          placeholder="Ej. El Mercadito bajó los precios de varios productos. Entra a Tráelo y descubre las nuevas ofertas."
          maxLength={500}
          rows={3}
          error={errors.body?.message}
          {...register('body')}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Audiencia</span>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
            Todos los clientes (única audiencia disponible por ahora)
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Destino</span>
          <Controller
            control={control}
            name="destinationType"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {DESTINATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => field.onChange(option.value)}
                    className={
                      field.value === option.value
                        ? 'rounded-full bg-brand-600 px-3 py-1.5 text-sm font-medium text-white'
                        : 'rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50'
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          />
        </div>

        {destinationType === 'BUSINESS' && (
          <Controller
            control={control}
            name="businessId"
            render={({ field }) => (
              <SearchableSelect
                label="Negocio"
                value={field.value}
                onChange={field.onChange}
                placeholder="Buscar negocio…"
                options={businessOptions}
                error={errors.businessId?.message}
              />
            )}
          />
        )}

        {destinationType === 'PRODUCT' && (
          <>
            <SearchableSelect
              label="Negocio"
              value={productBusinessId}
              onChange={(value) => setProductBusinessId(value)}
              placeholder="Primero elegí el negocio…"
              options={businessOptions}
            />
            <Controller
              control={control}
              name="productId"
              render={({ field }) => (
                <SearchableSelect
                  label="Producto"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={productBusinessId ? 'Buscar producto…' : 'Elegí un negocio primero'}
                  options={productOptions}
                  disabled={!productBusinessId}
                  error={errors.productId?.message}
                />
              )}
            />
          </>
        )}

        {destinationType === 'CATEGORY' && (
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <SearchableSelect
                label="Categoría"
                value={field.value}
                onChange={field.onChange}
                placeholder="Buscar categoría…"
                options={categoryOptions}
                error={errors.categoryId?.message}
              />
            )}
          />
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Vista previa</span>
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
              <Bell className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{title || 'Título de la notificación'}</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{body || 'El mensaje aparecerá acá.'}</p>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Enviar notificación</Button>
        </div>
      </form>
    </Modal>
  );
}
