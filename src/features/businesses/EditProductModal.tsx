import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/ToastProvider';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { PackagingEditor } from './PackagingEditor';
import type { ProductDTO } from '@/lib/types';
import { useListCategoriesQuery } from '@/features/categories/categoriesApi';
import {
  useSetProductAvailabilityMutation,
  useUpdateProductMutation,
  useUploadProductImageMutation,
} from './businessesApi';

const schema = z.object({
  name: z.string().min(1, 'Requerido').max(150),
  description: z.string().max(2000).optional(),
  category: z.string().max(80).optional(),
  categoryId: z.string().nullable(),
  price: z
    .string()
    .optional()
    .refine((v) => !v || Number(v) >= 0, 'Debe ser mayor o igual a 0'),
  packaging: z.array(
    z.object({
      name: z.string().trim().min(1, 'Requerido').max(60),
      price: z
        .string()
        .min(1, 'Requerido')
        .refine((v) => Number(v) >= 0, 'Debe ser ≥ 0'),
      capacity: z
        .string()
        .refine((v) => !v || (Number.isInteger(Number(v)) && Number(v) >= 1), 'Entero ≥ 1'),
    }),
  ),
});

type FormValues = z.infer<typeof schema>;

interface EditProductModalProps {
  businessId: string;
  product: ProductDTO;
  onClose: () => void;
}

export function EditProductModal({ businessId, product, onClose }: EditProductModalProps) {
  const { showToast } = useToast();
  const [updateProduct, { isLoading, error }] = useUpdateProductMutation();
  const [setAvailability] = useSetProductAvailabilityMutation();
  const [uploadImage] = useUploadProductImageMutation();
  const { data: categoriesData } = useListCategoriesQuery({ active: true, pageSize: 100 });

  async function handleAvailabilityChange(patch: { available?: boolean; lowStock?: boolean }) {
    const res = await setAvailability({ businessId, productId: product.id, ...patch });
    if ('error' in res) {
      showToast('No se pudo actualizar', 'error');
    }
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: product.name,
      description: product.description ?? '',
      category: product.category ?? '',
      categoryId: product.categoryId,
      price: product.price?.toString() ?? '',
      packaging: (product.packaging ?? []).map((option) => ({
        name: option.name,
        price: option.price.toString(),
        capacity: option.capacity?.toString() ?? '',
      })),
    },
  });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  async function onSubmit(values: FormValues) {
    await updateProduct({
      businessId,
      productId: product.id,
      body: {
        name: values.name,
        description: values.description || null,
        category: values.category || undefined,
        categoryId: values.categoryId,
        price: values.price ? Number(values.price) : undefined,
        packaging: values.packaging.map((option) => ({
          name: option.name.trim(),
          price: Number(option.price),
          ...(option.capacity ? { capacity: Number(option.capacity) } : {}),
        })),
      },
    }).unwrap();
    onClose();
  }

  return (
    <Modal title="Editar producto" onClose={onClose}>
      <div className="mb-4 flex items-center gap-4">
        <ImageUploader
          currentImageUrl={product.imageUrl}
          onUpload={(file) => uploadImage({ businessId, productId: product.id, file }).unwrap()}
          successMessage="Imagen actualizada"
        />
        <div className="flex flex-1 flex-col gap-3">
          <Switch
            checked={product.available}
            onChange={(available) => handleAvailabilityChange({ available })}
            label="Disponible (hay stock)"
          />
          <Switch
            checked={product.lowStock}
            onChange={(lowStock) => handleAvailabilityChange({ lowStock })}
            label="Queda poco stock"
          />
        </div>
      </div>

      <FormProvider {...form}>
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
          <FormField
            label="Precio referencial (opcional)"
            type="number"
            min={0}
            step="0.01"
            error={errors.price?.message}
            {...register('price')}
          />
          <PackagingEditor />
          {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}
          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Guardar
            </Button>
          </div>
        </form>
      </FormProvider>
    </Modal>
  );
}
