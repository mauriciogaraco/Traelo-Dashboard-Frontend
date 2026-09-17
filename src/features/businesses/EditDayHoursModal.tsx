import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { DAY_OF_WEEK_LABEL } from '@/lib/labels';
import type { BusinessHoursDTO } from '@/lib/types';
import { useUpsertBusinessHoursMutation } from './businessesApi';

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:mm');

const schema = z
  .object({
    openTime: timeSchema,
    closeTime: timeSchema,
    closed: z.boolean(),
  })
  .refine((data) => data.openTime < data.closeTime, {
    message: 'El horario de apertura debe ser anterior al de cierre',
    path: ['closeTime'],
  });

type FormValues = z.infer<typeof schema>;

interface EditDayHoursModalProps {
  businessId: string;
  dayOfWeek: number;
  current: BusinessHoursDTO | undefined;
  onClose: () => void;
}

export function EditDayHoursModal({
  businessId,
  dayOfWeek,
  current,
  onClose,
}: EditDayHoursModalProps) {
  const [upsertHours, { isLoading, error }] = useUpsertBusinessHoursMutation();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      openTime: current?.openTime ?? '09:00',
      closeTime: current?.closeTime ?? '22:00',
      closed: current?.closed ?? false,
    },
  });

  const closed = watch('closed');

  async function onSubmit(values: FormValues) {
    await upsertHours({ businessId, dayOfWeek, ...values }).unwrap();
    onClose();
  }

  return (
    <Modal title={`Horario · ${DAY_OF_WEEK_LABEL[dayOfWeek]}`} onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Switch checked={closed} onChange={(v) => setValue('closed', v)} label="Cerrado este día" />
        <FormField
          label="Apertura"
          type="time"
          error={errors.openTime?.message}
          {...register('openTime')}
        />
        <FormField
          label="Cierre"
          type="time"
          error={errors.closeTime?.message}
          {...register('closeTime')}
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
