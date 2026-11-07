import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { getErrorMessage } from '@/lib/getErrorMessage';
import type { PriceCurrency, ProductDTO } from '@/lib/types';
import { useListCategoriesQuery } from '@/features/categories/categoriesApi';
import { useCreateProductMutation } from './businessesApi';
import { BulkPriceFields, bulkPriceShape, bulkPriceToApi, refineBulkPrice } from './BulkPriceFields';

const schema = z.object({
  name: z.string().min(1, 'Requerido').max(150),
  description: z.string().max(2000).optional(),
  category: z.string().max(80).optional(),
  categoryId: z.string().nullable(),
  price: z
    .string()
    .optional()
    .refine((v) => !v || Number(v) >= 0, 'Debe ser mayor o igual a 0'),
  ...bulkPriceShape,
}).superRefine(refineBulkPrice);

type FormValues = z.infer<typeof schema>;

interface CreateProductModalProps {
  businessId: string;
  // Moneda con la que nace el producto: la de su negocio (CUP por defecto).
  defaultCurrency?: PriceCurrency;
  onClose: () => void;
  // El alta no acepta imagen (el backend solo recibe el archivo vía POST .../products/:id/image,
  // que necesita un producto ya creado) — se la pasamos al que abre este modal para que, si
  // quiere, encadene la edición y el usuario suba la foto sin tener que volver a buscar el
  // producto en la lista.
  onCreated?: (product: ProductDTO) => void;
}

export function CreateProductModal({ businessId, defaultCurrency = 'CUP', onClose, onCreated }: CreateProductModalProps) {
  const [createProduct, { isLoading, error }] = useCreateProductMutation();
  const [currency, setCurrency] = useState<PriceCurrency>(defaultCurrency);
  const { data: categoriesData } = useListCategoriesQuery({ active: true, pageSize: 100 });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      categoryId: null,
      price: '',
      bulkEnabled: false,
      bulkMinQuantity: '',
      bulkPrice: '',
    },
  });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  async function onSubmit(values: FormValues) {
    const created = await createProduct({
      businessId,
      name: values.name,
      description: values.description || undefined,
      category: values.category || undefined,
      categoryId: values.categoryId ?? undefined,
      price: values.price ? Number(values.price) : undefined,
      ...(values.bulkEnabled ? bulkPriceToApi(values) : {}),
      priceCurrency: currency,
    }).unwrap();
    onCreated?.(created.data);
    onClose();
  }

  return (
    <Modal title="Nuevo producto" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label="Nombre" error={errors.name?.message} {...register('name')} />
        <Textarea
          label="Descripción (opcional)"
          error={errors.description?.message}
          {...register('description')}
        />
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <SearchableSelect
              label="Categoría (opcional)"
              value={field.value}
              onChange={field.onChange}
              placeholder="Buscar categoría…"
              options={(categoriesData?.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
            />
          )}
        />
        <FormField
          label="Categoría, texto libre (opcional)"
          placeholder="Ej. Postres caseros"
          error={errors.category?.message}
          {...register('category')}
        />
        <Switch checked={currency === 'USD'} onChange={(usd) => setCurrency(usd ? 'USD' : 'CUP')} label="El precio está en USD" />
        <FormField
          label={`Precio referencial (opcional) — ${currency}`}
          type="number"
          min={0}
          step="0.01"
          error={errors.price?.message}
          {...register('price')}
        />
        {currency === 'USD' && (
          <p className="-mt-2 text-xs text-slate-500">
            Al cliente se le muestra y cobra en CUP, convertido con la tasa de cambio (Configuración).
          </p>
        )}
        <FormProvider {...form}>
          <BulkPriceFields />
        </FormProvider>
        {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Crear producto
          </Button>
        </div>
      </form>
    </Modal>
  );
}
