import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Textarea } from '@/components/ui/Textarea';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { useGetConfigQuery, useUpdateConfigMutation } from './configApi';

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
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      defaultDelivererCommissionPercentage: '',
      rafflePromoText: '',
      raffleVideoUrl: '',
    },
  });

  useEffect(() => {
    if (!data) return;
    reset({
      defaultDelivererCommissionPercentage: data.data.defaultDelivererCommissionPercentage.toString(),
      rafflePromoText: data.data.rafflePromoText ?? '',
      raffleVideoUrl: data.data.raffleVideoUrl ?? '',
    });
  }, [data, reset]);

  async function onSubmit(values: FormValues) {
    await updateConfig({
      defaultDelivererCommissionPercentage: Number(values.defaultDelivererCommissionPercentage),
      rafflePromoText: values.rafflePromoText || null,
      raffleVideoUrl: values.raffleVideoUrl || null,
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
