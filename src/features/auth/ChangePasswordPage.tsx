import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { useChangePasswordMutation } from './authApi';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Requerido'),
    newPassword: z.string().min(8, 'Mínimo 8 caracteres').max(72),
    confirmPassword: z.string().min(1, 'Confirma la contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const [changePassword, { isLoading, error }] = useChangePasswordMutation();
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    await changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    }).unwrap();
    setSuccess(true);
    reset();
  }

  return (
    <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-6">
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Cambiar contraseña</h1>
      <p className="mb-6 text-sm text-slate-500">
        Se cerrarán tus demás sesiones al completar el cambio.
      </p>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField
          label="Contraseña actual"
          type="password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <FormField
          label="Nueva contraseña"
          type="password"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <FormField
          label="Confirmar contraseña"
          type="password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}
        {success && <p className="text-sm text-green-600">Contraseña actualizada.</p>}
        <Button type="submit" isLoading={isLoading} className="w-full">
          Guardar
        </Button>
      </form>
    </div>
  );
}
