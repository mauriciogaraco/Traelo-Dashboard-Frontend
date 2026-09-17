import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { useListCategoriesQuery } from '@/features/categories/categoriesApi';
import { useCreateProductMutation } from './businessesApi';

const schema = z.object({
  name: z.string().min(1, 'Requerido').max(150),
  description: z.string().max(2000).optional(),
  category: z.string().max(80).optional(),
  categoryId: z.string().nullable(),
  price: z
    .string()
    .optional()
    .refine((v) => !v || Number(v) >= 0, 'Debe ser mayor o igual a 0'),
});

type FormValues = z.infer<typeof schema>;

interface CreateProductModalProps {
  businessId: string;
  onClose: () => void;
}

export function CreateProductModal({ businessId, onClose }: CreateProductModalProps) {
  const [createProduct, { isLoading, error }] = useCreateProductMutation();
  const { data: categoriesData } = useListCategoriesQuery({ active: true, pageSize: 100 });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', category: '', categoryId: null, price: '' },
  });

  async function onSubmit(values: FormValues) {
    await createProduct({
      businessId,
      name: values.name,
      description: values.description || undefined,
      category: values.category || undefined,
      categoryId: values.categoryId ?? undefined,
      price: values.price ? Number(values.price) : undefined,
    }).unwrap();
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
        <FormField
          label="Precio referencial (opcional)"
          type="number"
          min={0}
          step="0.01"
          error={errors.price?.message}
          {...register('price')}
        />
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
