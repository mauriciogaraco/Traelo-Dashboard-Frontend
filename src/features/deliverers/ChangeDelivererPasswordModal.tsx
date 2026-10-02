import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { useResetUserPasswordMutation } from '@/features/users/usersApi';
import { getErrorMessage } from '@/lib/getErrorMessage';
import type { DelivererDTO } from '@/lib/types';

// Mismos límites que resetPasswordSchema del backend (min 8, max 72).
const schema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres'),
    confirm: z.string().min(1, 'Repite la contraseña'),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  });

type FormValues = z.infer<typeof schema>;

interface ChangeDelivererPasswordModalProps {
  deliverer: DelivererDTO;
  onClose: () => void;
}

export function ChangeDelivererPasswordModal({
  deliverer,
  onClose,
}: ChangeDelivererPasswordModalProps) {
  const { showToast } = useToast();
  // Un mensajero es un usuario (role DELIVERER): la contraseña vive en User, no en Deliverer.
  const [resetPassword, { isLoading, error }] = useResetUserPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  async function onSubmit(values: FormValues) {
    await resetPassword({ id: deliverer.userId, password: values.password }).unwrap();
    showToast(`Contraseña de ${deliverer.name} actualizada`);
    onClose();
  }

  return (
    <Modal title="Cambiar contraseña" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <p className="text-sm text-slate-500">
          Nueva contraseña para <span className="font-medium text-slate-900">{deliverer.name}</span>{' '}
          ({deliverer.email}). Compártela con el mensajero por un canal seguro.
        </p>
        <FormField
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          autoFocus
          error={errors.password?.message}
          {...register('password')}
        />
        <FormField
          label="Repite la contraseña"
          type="password"
          autoComplete="new-password"
          error={errors.confirm?.message}
          {...register('confirm')}
        />
        {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Cambiar contraseña
          </Button>
        </div>
      </form>
    </Modal>
  );
}
