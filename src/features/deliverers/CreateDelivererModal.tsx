import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { useCreateDelivererMutation } from './deliverersApi';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  email: z.email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(72),
  phone: z.string().min(6, 'Mínimo 6 caracteres').max(30),
  commissionPercentage: z
    .string()
    .optional()
    .refine((v) => !v || (Number(v) >= 0 && Number(v) <= 100), 'Debe estar entre 0 y 100'),
});

type FormValues = z.infer<typeof schema>;

interface CreateDelivererModalProps {
  onClose: () => void;
}

export function CreateDelivererModal({ onClose }: CreateDelivererModalProps) {
  const [createDeliverer, { isLoading, error }] = useCreateDelivererMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', phone: '', commissionPercentage: '' },
  });

  async function onSubmit(values: FormValues) {
    await createDeliverer({
      name: values.name,
      email: values.email,
      password: values.password,
      phone: values.phone,
      commissionPercentage: values.commissionPercentage
        ? Number(values.commissionPercentage)
        : undefined,
    }).unwrap();
    onClose();
  }

  return (
    <Modal title="Nuevo mensajero" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label="Nombre" error={errors.name?.message} {...register('name')} />
        <FormField
          label="Correo"
          type="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <FormField
          label="Contraseña"
          type="password"
          error={errors.password?.message}
          {...register('password')}
        />
        <FormField label="Teléfono" error={errors.phone?.message} {...register('phone')} />
        <FormField
          label="% Comisión propio (opcional)"
          type="number"
          min={0}
          max={100}
          step="0.01"
          placeholder="Usa el % por defecto del sistema si se deja vacío"
          error={errors.commissionPercentage?.message}
          {...register('commissionPercentage')}
        />
        {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Crear mensajero
          </Button>
        </div>
      </form>
    </Modal>
  );
}
