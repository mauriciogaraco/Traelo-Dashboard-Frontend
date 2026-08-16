import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { getErrorMessage } from '@/lib/getErrorMessage';
import type { BusinessSubscriptionDTO } from '@/lib/types';
import { useUpdateSubscriptionMutation } from './businessesApi';

const schema = z.object({
  endDate: z.string().min(1, 'Requerido'),
});

type FormValues = z.infer<typeof schema>;

interface RenewSubscriptionModalProps {
  businessId: string;
  subscription: BusinessSubscriptionDTO;
  onClose: () => void;
}

export function RenewSubscriptionModal({
  businessId,
  subscription,
  onClose,
}: RenewSubscriptionModalProps) {
  const [updateSubscription, { isLoading, error }] = useUpdateSubscriptionMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { endDate: subscription.endDate.slice(0, 10) },
  });

  async function onSubmit(values: FormValues) {
    await updateSubscription({
      businessId,
      subId: subscription.id,
      // Se ancla al mediodía local antes de convertir a ISO para que el día elegido
      // en el input no se corra al convertir a UTC (ver zonas horarias negativas).
      body: { endDate: new Date(`${values.endDate}T12:00:00`).toISOString() },
    }).unwrap();
    onClose();
  }

  return (
    <Modal title="Renovar suscripción" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField
          label="Nueva fecha de fin"
          type="date"
          error={errors.endDate?.message}
          {...register('endDate')}
        />
        {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Renovar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
