import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { useGetConfigQuery, useUpdateConfigMutation } from './configApi';

// "1970-01-01T21:00:00.000Z" -> "21:00". El backend ancla las horas del día a 1970-01-01 UTC.
function isoToTime(iso: string | null | undefined): string {
  return iso ? iso.slice(11, 16) : '';
}

const timeField = z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida');

const schema = z.object({
  defaultDelivererCommissionPercentage: z
    .string()
    .min(1, 'Requerido')
    .refine((v) => Number(v) >= 0 && Number(v) <= 100, 'Debe estar entre 0 y 100'),
  rafflePromoText: z.string().max(2000).optional(),
  raffleVideoUrl: z
    .string()
    .max(500)
    .optional()
    .refine((v) => !v || /^https?:\/\/.+/i.test(v), 'Debe ser una URL válida (http/https)'),
  operatingHoursEnabled: z.boolean(),
  operatingHoursStart: timeField,
  operatingHoursEnd: timeField,
  operatingHoursWeekendEnd: timeField,
}).superRefine((values, ctx) => {
  if (!values.operatingHoursEnabled) return;
  const { operatingHoursStart: start, operatingHoursEnd: end, operatingHoursWeekendEnd: weekend } = values;
  if (!start) ctx.addIssue({ code: 'custom', path: ['operatingHoursStart'], message: 'Requerido' });
  if (!end) ctx.addIssue({ code: 'custom', path: ['operatingHoursEnd'], message: 'Requerido' });
  // "HH:mm" se ordena igual como texto que como hora.
  if (start && end && start >= end) {
    ctx.addIssue({ code: 'custom', path: ['operatingHoursEnd'], message: 'Debe ser posterior a la apertura' });
  }
  if (start && weekend && start >= weekend) {
    ctx.addIssue({ code: 'custom', path: ['operatingHoursWeekendEnd'], message: 'Debe ser posterior a la apertura' });
  }
});

type FormValues = z.infer<typeof schema>;

export function ConfigPage() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const canEdit = currentUser?.role === 'OWNER';
  const { data, isLoading } = useGetConfigQuery();
  const [updateConfig, { isLoading: isSaving, error }] = useUpdateConfigMutation();
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      defaultDelivererCommissionPercentage: '',
      rafflePromoText: '',
      raffleVideoUrl: '',
      operatingHoursEnabled: false,
      operatingHoursStart: '',
      operatingHoursEnd: '',
      operatingHoursWeekendEnd: '',
    },
  });
  const hoursEnabled = watch('operatingHoursEnabled');

  useEffect(() => {
    if (!data) return;
    reset({
      defaultDelivererCommissionPercentage: data.data.defaultDelivererCommissionPercentage.toString(),
      rafflePromoText: data.data.rafflePromoText ?? '',
      raffleVideoUrl: data.data.raffleVideoUrl ?? '',
      operatingHoursEnabled: data.data.operatingHoursEnabled,
      operatingHoursStart: isoToTime(data.data.operatingHoursStart),
      operatingHoursEnd: isoToTime(data.data.operatingHoursEnd),
      operatingHoursWeekendEnd: isoToTime(data.data.operatingHoursWeekendEnd),
    });
  }, [data, reset]);

  async function onSubmit(values: FormValues) {
    await updateConfig({
      defaultDelivererCommissionPercentage: Number(values.defaultDelivererCommissionPercentage),
      rafflePromoText: values.rafflePromoText || null,
      raffleVideoUrl: values.raffleVideoUrl || null,
      operatingHoursEnabled: values.operatingHoursEnabled,
      operatingHoursStart: values.operatingHoursStart || null,
      operatingHoursEnd: values.operatingHoursEnd || null,
      operatingHoursWeekendEnd: values.operatingHoursWeekendEnd || null,
    }).unwrap();
    setSuccess(true);
  }

  if (isLoading) {
    return <p className="text-slate-400">Cargando…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Configuración del sistema</h1>
      {!canEdit && (
        <p className="text-sm text-slate-500">
          Solo el dueño puede modificar esta configuración. La mostramos como referencia.
        </p>
      )}

      <form
        className="flex max-w-lg flex-col gap-6"
        onSubmit={handleSubmit(onSubmit)}
        onChange={() => setSuccess(false)}
        noValidate
      >
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Comisión de mensajeros</h2>
          <p className="mb-3 text-sm text-slate-500">
            Porcentaje que se usa por defecto cuando un mensajero no tiene una comisión propia
            configurada.
          </p>
          <FormField
            label="% Comisión por defecto"
            type="number"
            min={0}
            max={100}
            step="0.01"
            disabled={!canEdit}
            error={errors.defaultDelivererCommissionPercentage?.message}
            {...register('defaultDelivererCommissionPercentage')}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Horario de pedidos</h2>
          <p className="mb-3 text-sm text-slate-500">
            Fuera de este horario (hora de La Habana) no se reciben pedidos de la app ni de la web.
            Viernes, sábado y domingo pueden cerrar más tarde que el resto de la semana.
          </p>
          <div className="flex flex-col gap-4">
            <Switch
              checked={hoursEnabled}
              onChange={(value) => {
                if (canEdit) setValue('operatingHoursEnabled', value, { shouldDirty: true });
              }}
              label="Limitar los pedidos por horario"
            />
            <FormField
              label="Abren a las"
              type="time"
              disabled={!canEdit}
              error={errors.operatingHoursStart?.message}
              {...register('operatingHoursStart')}
            />
            <FormField
              label="Cierran de lunes a jueves"
              type="time"
              disabled={!canEdit}
              error={errors.operatingHoursEnd?.message}
              {...register('operatingHoursEnd')}
            />
            <FormField
              label="Cierran viernes, sábado y domingo (opcional)"
              type="time"
              disabled={!canEdit}
              error={errors.operatingHoursWeekendEnd?.message}
              {...register('operatingHoursWeekendEnd')}
            />
            {!hoursEnabled && (
              <p className="text-xs text-slate-400">
                El horario está apagado: se reciben pedidos a cualquier hora. Si dejás vacío el cierre
                de fin de semana, esos días cierran igual que el resto.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Promoción del vale</h2>
          <p className="mb-3 text-sm text-slate-500">
            Texto opcional (por ejemplo, una campaña de sorteo vigente) que se agrega al final de
            cualquier vale generado desde un pedido. Dejalo vacío para no agregar nada.
          </p>
          <div className="flex flex-col gap-4">
            <Textarea
              label="Texto promocional (opcional)"
              rows={4}
              placeholder="Ej. Recuerda que el sorteo por los 15 mil CUP en premio ya está activo hasta el lunes 26 de septiembre…"
              disabled={!canEdit}
              error={errors.rafflePromoText?.message}
              {...register('rafflePromoText')}
            />
            <FormField
              label="Link del video (opcional)"
              placeholder="https://…"
              disabled={!canEdit}
              error={errors.raffleVideoUrl?.message}
              {...register('raffleVideoUrl')}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}
        {success && <p className="text-sm text-green-600">Configuración actualizada.</p>}
        {canEdit && (
          <Button type="submit" isLoading={isSaving} className="w-fit">
            Guardar
          </Button>
        )}
      </form>
    </div>
  );
}
