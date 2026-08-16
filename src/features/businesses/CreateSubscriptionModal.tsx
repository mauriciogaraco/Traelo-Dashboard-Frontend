import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { FormSelect } from '@/components/ui/FormSelect';
import { Modal } from '@/components/ui/Modal';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { SUBSCRIPTION_CYCLE_LABEL } from '@/lib/labels';
import { SubscriptionCycle } from '@/lib/types';
import { useCreateSubscriptionMutation } from './businessesApi';

const schema = z.object({
  cycle: z.enum(SubscriptionCycle),
  price: z.string().min(1, 'Requerido').refine((v) => Number(v) >= 0, 'Debe ser mayor o igual a 0'),
});

type FormValues = z.infer<typeof schema>;

interface CreateSubscriptionModalProps {
  businessId: string;
  onClose: () => void;
}

export function CreateSubscriptionModal({ businessId, onClose }: CreateSubscriptionModalProps) {
  const [createSubscription, { isLoading, error }] = useCreateSubscriptionMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { cycle: 'DAYS_30', price: '' },
  });

  async function onSubmit(values: FormValues) {
    await createSubscription({
      businessId,
      cycle: values.cycle,
      price: Number(values.price),
    }).unwrap();
    onClose();
  }

  return (
    <Modal title="Nueva suscripción" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <p className="text-sm text-slate-500">
          Reemplaza la suscripción activa actual (si hay una) y arranca hoy por el ciclo elegido.
        </p>
        <FormSelect label="Ciclo" error={errors.cycle?.message} {...register('cycle')}>
          {Object.values(SubscriptionCycle).map((cycle) => (
            <option key={cycle} value={cycle}>
              {SUBSCRIPTION_CYCLE_LABEL[cycle]}
            </option>
          ))}
        </FormSelect>
        <FormField
          label="Precio (CUP)"
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
            Crear suscripción
          </Button>
        </div>
      </form>
    </Modal>
  );
}
