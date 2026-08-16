import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { useCreateProductMutation } from './businessesApi';

const schema = z.object({
  name: z.string().min(1, 'Requerido').max(150),
  category: z.string().max(80).optional(),
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', category: '', price: '' },
  });

  async function onSubmit(values: FormValues) {
    await createProduct({
      businessId,
      name: values.name,
      category: values.category || undefined,
      price: values.price ? Number(values.price) : undefined,
    }).unwrap();
    onClose();
  }

  return (
    <Modal title="Nuevo producto" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label="Nombre" error={errors.name?.message} {...register('name')} />
        <FormField
          label="Categoría (opcional)"
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
