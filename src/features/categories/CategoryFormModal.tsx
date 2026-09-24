import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { Modal } from '@/components/ui/Modal';
import { getErrorMessage } from '@/lib/getErrorMessage';
import type { CategoryDTO } from '@/lib/types';
import {
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useUploadCategoryImageMutation,
} from './categoriesApi';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(80),
  slug: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Solo minúsculas, números y guiones (ej. comida-rapida)'),
  icon: z.string().max(80).optional(),
  sortOrder: z
    .string()
    .optional()
    .refine(
      (v) => !v || (Number.isInteger(Number(v)) && Number(v) >= 0),
      'Entero mayor o igual a 0',
    ),
});

type FormValues = z.infer<typeof schema>;

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

interface CategoryFormModalProps {
  category?: CategoryDTO;
  onClose: () => void;
}

export function CategoryFormModal({ category, onClose }: CategoryFormModalProps) {
  const isEdit = !!category;
  const [createCategory, { isLoading: isCreating, error: createError }] =
    useCreateCategoryMutation();
  const [updateCategory, { isLoading: isUpdating, error: updateError }] =
    useUpdateCategoryMutation();
  const [uploadCategoryImage] = useUploadCategoryImageMutation();
  // Mientras el usuario no toque el slug a mano, se deriva del nombre.
  const [slugTouched, setSlugTouched] = useState(isEdit);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      icon: category?.icon ?? '',
      sortOrder: category ? String(category.sortOrder) : '0',
    },
  });

  const nameField = register('name');
  const slugField = register('slug');

  async function onSubmit(values: FormValues) {
    const sortOrder = values.sortOrder ? Number(values.sortOrder) : undefined;
    const icon = values.icon?.trim() || undefined;
    if (category) {
      await updateCategory({
        id: category.id,
        body: { name: values.name, slug: values.slug, icon, sortOrder },
      }).unwrap();
    } else {
      await createCategory({ name: values.name, slug: values.slug, icon, sortOrder }).unwrap();
    }
    onClose();
  }

  const error = createError ?? updateError;

  return (
    <Modal title={isEdit ? 'Editar categoría' : 'Nueva categoría'} onClose={onClose}>
      {isEdit && (
        <div className="mb-4 flex items-center gap-4">
          <ImageUploader
            currentImageUrl={category.imageUrl}
            onUpload={(file) => uploadCategoryImage({ id: category.id, file }).unwrap()}
            successMessage="Imagen actualizada"
          />
          <p className="flex-1 text-sm text-slate-500">
            Se muestra en la app. Sin imagen, la app cae al ícono de abajo; sin ícono, muestra uno
            genérico.
          </p>
        </div>
      )}
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField
          label="Nombre"
          placeholder="Ej. Comida rápida"
          error={errors.name?.message}
          {...nameField}
          onChange={(e) => {
            void nameField.onChange(e);
            if (!slugTouched) {
              setValue('slug', slugify(e.target.value), { shouldValidate: true });
            }
          }}
        />
        <FormField
          label="Slug"
          placeholder="comida-rapida"
          error={errors.slug?.message}
          {...slugField}
          onChange={(e) => {
            setSlugTouched(true);
            void slugField.onChange(e);
          }}
        />
        <FormField
          label="Ícono (opcional)"
          placeholder="Nombre del ícono que usa la app"
          error={errors.icon?.message}
          {...register('icon')}
        />
        <FormField
          label="Orden"
          type="number"
          min={0}
          step={1}
          error={errors.sortOrder?.message}
          {...register('sortOrder')}
        />
        {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isCreating || isUpdating}>
            {isEdit ? 'Guardar' : 'Crear categoría'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
