import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { getErrorMessage } from '@/lib/getErrorMessage';
import type { UserDTO } from '@/lib/types';
import { useResetUserPasswordMutation, useUpdateUserMutation } from './usersApi';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || (v.length >= 6 && v.length <= 30), 'Debe tener entre 6 y 30 caracteres'),
  password: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 8, 'Mínimo 8 caracteres'),
});

type FormValues = z.infer<typeof schema>;

interface EditUserModalProps {
  user: UserDTO;
  onClose: () => void;
}

export function EditUserModal({ user, onClose }: EditUserModalProps) {
  const [updateUser, { isLoading: isUpdating, error: updateError }] = useUpdateUserMutation();
  const [resetPassword, { isLoading: isResetting, error: resetError }] =
    useResetUserPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: user.name, phone: user.phone ?? '', password: '' },
  });

  async function onSubmit(values: FormValues) {
    await updateUser({
      id: user.id,
      body: { name: values.name, phone: values.phone || undefined },
    }).unwrap();
    if (values.password) {
      await resetPassword({ id: user.id, password: values.password }).unwrap();
    }
    onClose();
  }

  const isLoading = isUpdating || isResetting;
  const error = updateError ?? resetError;

  return (
    <Modal title="Editar usuario" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label="Nombre" error={errors.name?.message} {...register('name')} />
        <FormField label="Teléfono" error={errors.phone?.message} {...register('phone')} />
        <FormField
          label="Nueva contraseña (opcional)"
          type="password"
          placeholder="Dejar en blanco para no cambiarla"
          error={errors.password?.message}
          {...register('password')}
        />
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
    </Modal>
  );
}
