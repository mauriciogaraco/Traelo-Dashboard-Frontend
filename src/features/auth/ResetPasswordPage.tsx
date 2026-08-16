import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { AuthLayout } from './AuthLayout';
import { useResetPasswordMutation } from './authApi';

const schema = z
  .object({
    token: z.string().min(1, 'Token requerido'),
    newPassword: z.string().min(8, 'Mínimo 8 caracteres').max(72),
    confirmPassword: z.string().min(1, 'Confirma la contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [resetPassword, { isLoading, error }] = useResetPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { token: searchParams.get('token') ?? '', newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values: FormValues) {
    await resetPassword({ token: values.token, newPassword: values.newPassword }).unwrap();
    navigate('/login', { replace: true });
  }

  return (
    <AuthLayout title="Restablecer contraseña">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label="Token" error={errors.token?.message} {...register('token')} />
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
        <Button type="submit" isLoading={isLoading} className="w-full">
          Restablecer
        </Button>
      </form>
      <Link to="/login" className="mt-6 block text-center text-sm text-brand-600 hover:underline">
        Volver a iniciar sesión
      </Link>
    </AuthLayout>
  );
}
