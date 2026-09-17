import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { useCreateBusinessClosureMutation } from './businessesApi';

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  reason: z.string().max(200).optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreateClosureModalProps {
  businessId: string;
  onClose: () => void;
}

export function CreateClosureModal({ businessId, onClose }: CreateClosureModalProps) {
  const [createClosure, { isLoading, error }] = useCreateBusinessClosureMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: '', reason: '' },
  });

  async function onSubmit(values: FormValues) {
    await createClosure({
      businessId,
      date: values.date,
      reason: values.reason || undefined,
    }).unwrap();
    onClose();
  }

  return (
    <Modal title="Nuevo cierre excepcional" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField
          label="Fecha"
          type="date"
          error={errors.date?.message}
          {...register('date')}
        />
        <FormField
          label="Motivo (opcional)"
          placeholder="Ej. Feriado, mantenimiento…"
          error={errors.reason?.message}
          {...register('reason')}
        />
        {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Agregar cierre
          </Button>
        </div>
      </form>
    </Modal>
  );
}
