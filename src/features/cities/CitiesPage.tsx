import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/ToastProvider';
import { getErrorMessage } from '@/lib/getErrorMessage';
import type { CityDTO } from '@/lib/types';
import {
  useCreateCityMutation,
  useGetCityConfigQuery,
  useListCitiesQuery,
  useUpdateCityConfigMutation,
  useUpdateCityMutation,
} from './citiesApi';

// "1970-01-01T21:00:00.000Z" -> "21:00". El backend ancla las horas del día a 1970-01-01 UTC.
function isoToTime(iso: string | null | undefined): string {
  return iso ? iso.slice(11, 16) : '';
}

const createSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  code: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Solo minúsculas, números y guiones (ej. san-antonio)'),
});
type CreateValues = z.infer<typeof createSchema>;

function CreateCityModal({ onClose }: { onClose: () => void }) {
  const [createCity, { isLoading, error }] = useCreateCityMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', code: '' },
  });

  async function onSubmit(values: CreateValues) {
    await createCity(values).unwrap();
    onClose();
  }

  return (
    <Modal title="Nueva ciudad" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label="Nombre" error={errors.name?.message} {...register('name')} />
        <FormField
          label="Código"
          placeholder="san-antonio-de-los-banos"
          error={errors.code?.message}
          {...register('code')}
        />
        {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Crear ciudad
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const timeField = z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida');

const configSchema = z
  .object({
    acceptingOrders: z.boolean(),
    chargePlatformFee: z.boolean(),
    operatingHoursEnabled: z.boolean(),
    operatingHoursStart: timeField,
    operatingHoursEnd: timeField,
    operatingHoursWeekendEnd: timeField,
    operationalMessage: z.string().max(500),
  })
  .superRefine((v, ctx) => {
    if (!v.operatingHoursEnabled) return;
    if (!v.operatingHoursStart) {
      ctx.addIssue({ code: 'custom', path: ['operatingHoursStart'], message: 'Requerido' });
    }
    if (!v.operatingHoursEnd) {
      ctx.addIssue({ code: 'custom', path: ['operatingHoursEnd'], message: 'Requerido' });
    }
    // "HH:mm" se ordena igual como texto que como hora.
    if (v.operatingHoursStart && v.operatingHoursEnd && v.operatingHoursStart >= v.operatingHoursEnd) {
      ctx.addIssue({
        code: 'custom',
        path: ['operatingHoursEnd'],
        message: 'Debe ser posterior a la apertura',
      });
    }
    if (
      v.operatingHoursStart &&
      v.operatingHoursWeekendEnd &&
      v.operatingHoursStart >= v.operatingHoursWeekendEnd
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['operatingHoursWeekendEnd'],
        message: 'Debe ser posterior a la apertura',
      });
    }
  });
type ConfigValues = z.infer<typeof configSchema>;

function CityConfigModal({ city, onClose }: { city: CityDTO; onClose: () => void }) {
  const { data, isLoading } = useGetCityConfigQuery(city.id);
  const [updateConfig, { isLoading: isSaving, error }] = useUpdateCityConfigMutation();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ConfigValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      acceptingOrders: true,
      chargePlatformFee: true,
      operatingHoursEnabled: false,
      operatingHoursStart: '',
      operatingHoursEnd: '',
      operatingHoursWeekendEnd: '',
      operationalMessage: '',
    },
  });

  useEffect(() => {
    if (!data) return;
    const c = data.data;
    reset({
      acceptingOrders: c.acceptingOrders,
      chargePlatformFee: c.chargePlatformFee,
      operatingHoursEnabled: c.operatingHoursEnabled,
      operatingHoursStart: isoToTime(c.operatingHoursStart),
      operatingHoursEnd: isoToTime(c.operatingHoursEnd),
      operatingHoursWeekendEnd: isoToTime(c.operatingHoursWeekendEnd),
      operationalMessage: c.operationalMessage ?? '',
    });
  }, [data, reset]);

  async function onSubmit(values: ConfigValues) {
    await updateConfig({
      id: city.id,
      body: {
        acceptingOrders: values.acceptingOrders,
        chargePlatformFee: values.chargePlatformFee,
        operatingHoursEnabled: values.operatingHoursEnabled,
        operatingHoursStart: values.operatingHoursStart || null,
        operatingHoursEnd: values.operatingHoursEnd || null,
        operatingHoursWeekendEnd: values.operatingHoursWeekendEnd || null,
        operationalMessage: values.operationalMessage || null,
      },
    }).unwrap();
    onClose();
  }

  const hoursEnabled = watch('operatingHoursEnabled');
  const accepting = watch('acceptingOrders');
  const chargeFee = watch('chargePlatformFee');

  return (
    <Modal title={`Configuración · ${city.name}`} onClose={onClose}>
      {isLoading ? (
        <p className="text-slate-400">Cargando…</p>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Switch
            checked={accepting}
            onChange={(v) => setValue('acceptingOrders', v, { shouldDirty: true })}
            label="Aceptando pedidos"
          />
          <div className="flex flex-col gap-1">
            <Switch
              checked={chargeFee}
              onChange={(v) => setValue('chargePlatformFee', v, { shouldDirty: true })}
              label="Cobrar el Servicio Tráelo"
            />
            <p className="text-xs text-slate-500">
              Apagado: los pedidos nuevos de esta ciudad se cotizan y crean sin el cargo de servicio.
            </p>
          </div>
          <Switch
            checked={hoursEnabled}
            onChange={(v) => setValue('operatingHoursEnabled', v, { shouldDirty: true })}
            label="Limitar los pedidos por horario"
          />
          <FormField
            label="Abren a las"
            type="time"
            error={errors.operatingHoursStart?.message}
            {...register('operatingHoursStart')}
          />
          <FormField
            label="Cierran de lunes a jueves"
            type="time"
            error={errors.operatingHoursEnd?.message}
            {...register('operatingHoursEnd')}
          />
          <FormField
            label="Cierran viernes, sábado y domingo (opcional)"
            type="time"
            error={errors.operatingHoursWeekendEnd?.message}
            {...register('operatingHoursWeekendEnd')}
          />
          <Textarea
            label="Mensaje operativo (opcional)"
            error={errors.operationalMessage?.message}
            {...register('operationalMessage')}
          />
          {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}
          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Guardar
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function CitiesPage() {
  const { data, isLoading } = useListCitiesQuery({ pageSize: 100 });
  const [updateCity, { isLoading: isUpdating }] = useUpdateCityMutation();
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [configuring, setConfiguring] = useState<CityDTO | null>(null);

  const cities = data?.data ?? [];

  async function toggleActive(city: CityDTO) {
    try {
      await updateCity({ id: city.id, body: { active: !city.active } }).unwrap();
    } catch {
      showToast('No se pudo actualizar la ciudad', 'error');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Ciudades</h1>
        <Button type="button" onClick={() => setCreating(true)}>
          Nueva ciudad
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && cities.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No hay ciudades.
                </td>
              </tr>
            )}
            {cities.map((city) => (
              <tr key={city.id} className="text-slate-700">
                <td className="px-4 py-3 font-medium text-slate-900">{city.name}</td>
                <td className="px-4 py-3">{city.code}</td>
                <td className="px-4 py-3">
                  <Badge tone={city.active ? 'green' : 'slate'}>
                    {city.active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="ghost" onClick={() => setConfiguring(city)}>
                      Configurar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isUpdating}
                      onClick={() => toggleActive(city)}
                    >
                      {city.active ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && <CreateCityModal onClose={() => setCreating(false)} />}
      {configuring && <CityConfigModal city={configuring} onClose={() => setConfiguring(null)} />}
    </div>
  );
}
