import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAppDispatch } from '@/app/hooks';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { AuthLayout } from './AuthLayout';
import { useLoginMutation } from './authApi';
import { credentialsSet } from './authSlice';

const loginSchema = z.object({
  email: z.email('Correo inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading, error }] = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginForm) {
    const result = await login(values).unwrap();
    dispatch(credentialsSet(result.data));
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    navigate(from ?? '/', { replace: true });
  }

  return (
    <AuthLayout title="Inicia sesión" subtitle="Panel interno de operaciones">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField
          label="Correo"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <FormField
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}
        <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
          Entrar
        </Button>
        <Link to="/forgot-password" className="text-center text-sm text-brand-600 hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </form>
    </AuthLayout>
  );
}
