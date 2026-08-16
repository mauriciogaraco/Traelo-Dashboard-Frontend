import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { AuthLayout } from './AuthLayout';
import { useForgotPasswordMutation } from './authApi';

const schema = z.object({ email: z.email('Correo inválido') });
type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [forgotPassword, { isLoading, error }] = useForgotPasswordMutation();
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    await forgotPassword(values).unwrap();
    setSent(true);
  }

  return (
    <AuthLayout
      title="Recuperar contraseña"
      subtitle="Te enviaremos instrucciones si el correo existe"
    >
      {sent ? (
        <p className="text-sm text-slate-600">
          Si el correo existe, se enviarán instrucciones de recuperación.
        </p>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField
            label="Correo"
            type="email"
            error={errors.email?.message}
            {...register('email')}
          />
          {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}
          <Button type="submit" isLoading={isLoading} className="w-full">
            Enviar instrucciones
          </Button>
        </form>
      )}
      <Link to="/login" className="mt-6 block text-center text-sm text-brand-600 hover:underline">
        Volver a iniciar sesión
      </Link>
    </AuthLayout>
  );
}
