import type { SerializedError } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { FormSelect } from '@/components/ui/FormSelect';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/ToastProvider';
import { getErrorMessage } from '@/lib/getErrorMessage';
import type { CityDTO } from '@/lib/types';
import type { DeliveryRouteDTO } from '@/lib/types';
import {
  useCreateCityMutation,
  useGetCityConfigQuery,
  useListCitiesQuery,
  useListDeliveryRoutesQuery,
  useRemoveDeliveryRouteMutation,
  useSetDeliveryRouteMutation,
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
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});
type CreateValues = z.infer<typeof createSchema>;

// "22.793297" -> 22.793297; vacío -> undefined; inválido -> NaN.
function parseCoordinate(raw: string | undefined): number | undefined {
  const text = raw?.trim().replace(',', '.');
  return text ? Number(text) : undefined;
}
function validCoordinates(latRaw: string | undefined, lngRaw: string | undefined): boolean {
  const lat = parseCoordinate(latRaw);
  const lng = parseCoordinate(lngRaw);
  if (lat === undefined && lng === undefined) return true;
  return lat !== undefined && lng !== undefined && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function CreateCityModal({ onClose }: { onClose: () => void }) {
  const [createCity, { isLoading, error }] = useCreateCityMutation();
  const [coordsError, setCoordsError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', code: '', latitude: '', longitude: '' },
  });

  async function onSubmit(values: CreateValues) {
    if (!validCoordinates(values.latitude, values.longitude)) {
      setCoordsError('Escribe latitud y longitud juntas (ej. 22.793297 y -82.507271)');
      return;
    }
    setCoordsError(null);
    await createCity({
      name: values.name,
      code: values.code,
      latitude: parseCoordinate(values.latitude),
      longitude: parseCoordinate(values.longitude),
    }).unwrap();
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
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Latitud del centro (opcional)" placeholder="22.793297" {...register('latitude')} />
          <FormField label="Longitud del centro (opcional)" placeholder="-82.507271" {...register('longitude')} />
        </div>
        {coordsError && <p className="text-sm text-red-600">{coordsError}</p>}
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
    outOfTownFeePerKm: z.string().refine((v) => v === '' || Number(v) > 0, 'Debe ser mayor que 0'),
    latitude: z.string(),
    longitude: z.string(),
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
  const [updateCity] = useUpdateCityMutation();
  const [coordsError, setCoordsError] = useState<string | null>(null);
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
      outOfTownFeePerKm: '125',
      latitude: city.latitude != null ? String(city.latitude) : '',
      longitude: city.longitude != null ? String(city.longitude) : '',
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
      outOfTownFeePerKm: String(c.outOfTownFeePerKm ?? 125),
      latitude: city.latitude != null ? String(city.latitude) : '',
      longitude: city.longitude != null ? String(city.longitude) : '',
    });
  }, [data, reset, city.latitude, city.longitude]);

  async function onSubmit(values: ConfigValues) {
    if (!validCoordinates(values.latitude, values.longitude)) {
      setCoordsError('Escribe latitud y longitud juntas (ej. 22.793297 y -82.507271)');
      return;
    }
    setCoordsError(null);
    const lat = parseCoordinate(values.latitude);
    const lng = parseCoordinate(values.longitude);
    const coordsChanged = lat !== (city.latitude ?? undefined) || lng !== (city.longitude ?? undefined);
    if (coordsChanged) {
      await updateCity({
        id: city.id,
        body: { latitude: lat ?? null, longitude: lng ?? null },
      }).unwrap();
    }
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
        ...(values.outOfTownFeePerKm ? { outOfTownFeePerKm: Number(values.outOfTownFeePerKm) } : {}),
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

          <fieldset className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3">
            <legend className="px-1 text-sm font-medium text-slate-700">Entrega en «otra ubicación»</legend>
            <p className="text-xs text-slate-500">
              El cliente que no está en una localidad comparte su ubicación y la mensajería se cobra por kilómetro
              desde el CENTRO de este pueblo (no desde el negocio), con la mensajería normal como mínimo. Sin
              coordenadas, esa opción no se ofrece.
            </p>
            <FormField
              label="Mensajería por km (CUP)"
              type="number"
              min={1}
              step={5}
              error={errors.outOfTownFeePerKm?.message}
              {...register('outOfTownFeePerKm')}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Latitud del centro" placeholder="22.793297" {...register('latitude')} />
              <FormField label="Longitud del centro" placeholder="-82.507271" {...register('longitude')} />
            </div>
            {coordsError && <p className="text-sm text-red-600">{coordsError}</p>}
          </fieldset>
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

function formatCup(value: number): string {
  return `${value.toLocaleString('es')} CUP`;
}

// Una fila de tarifa: cada SENTIDO (negocios de A -> entrega en B) tiene su propio monto.
function DeliveryRouteRow({ route }: { route: DeliveryRouteDTO }) {
  const [setRoute, { isLoading: isSaving }] = useSetDeliveryRouteMutation();
  const [removeRoute, { isLoading: isRemoving }] = useRemoveDeliveryRouteMutation();
  const { showToast } = useToast();
  const [fee, setFee] = useState(String(route.fee));
  const pair = { originCityId: route.originCity.id, destinationCityId: route.destinationCity.id };
  const changed = Number(fee) !== route.fee;

  async function save() {
    const value = Number(fee);
    if (!Number.isFinite(value) || value <= 0) {
      showToast('La tarifa debe ser mayor que 0', 'error');
      return;
    }
    try {
      await setRoute({ ...pair, fee: value }).unwrap();
      showToast('Tarifa guardada', 'success');
    } catch (error) {
      showToast(getErrorMessage(error as FetchBaseQueryError | SerializedError), 'error');
    }
  }

  async function remove() {
    try {
      await removeRoute(pair).unwrap();
      showToast('Tarifa quitada: ya no se aceptan entregas en ese sentido', 'success');
    } catch (error) {
      showToast(getErrorMessage(error as FetchBaseQueryError | SerializedError), 'error');
    }
  }

  return (
    <tr className="text-slate-700">
      <td className="px-4 py-3 font-medium text-slate-900">
        {route.originCity.name} <span className="text-slate-400">→</span> {route.destinationCity.name}
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          min={1}
          step={50}
          value={fee}
          onChange={(event) => setFee(event.target.value)}
          aria-label={`Mensajería de ${route.originCity.name} a ${route.destinationCity.name}`}
          className="w-32 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />{' '}
        <span className="text-xs text-slate-500">CUP</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" disabled={!changed} isLoading={isSaving} onClick={save}>
            Guardar
          </Button>
          <Button type="button" variant="ghost" disabled={isRemoving} onClick={remove}>
            Quitar
          </Button>
        </div>
      </td>
    </tr>
  );
}

// Mensajería FIJA cuando un pedido se entrega en otra localidad que la de sus negocios. Reemplaza la
// mensajería normal de ese pedido (sin recargos). Sin tarifa para un sentido, ese pedido se rechaza.
function DeliveryRoutesPanel({ cities }: { cities: CityDTO[] }) {
  const { data, isLoading } = useListDeliveryRoutesQuery();
  const [setRoute, { isLoading: isSaving }] = useSetDeliveryRouteMutation();
  const { showToast } = useToast();
  const routes = data?.data ?? [];
  const active = cities.filter((city) => city.active);
  const [originCityId, setOriginCityId] = useState('');
  const [destinationCityId, setDestinationCityId] = useState('');
  const [fee, setFee] = useState('');

  if (active.length < 2) return null;

  async function add() {
    const value = Number(fee);
    if (!originCityId || !destinationCityId || originCityId === destinationCityId || !(value > 0)) {
      showToast('Elige dos localidades distintas y una tarifa mayor que 0', 'error');
      return;
    }
    try {
      await setRoute({ originCityId, destinationCityId, fee: value }).unwrap();
      showToast('Tarifa guardada', 'success');
      setFee('');
    } catch (error) {
      showToast(getErrorMessage(error as FetchBaseQueryError | SerializedError), 'error');
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Mensajería entre localidades</h2>
        <p className="text-sm text-slate-500">
          Cuando un cliente pide negocios de una localidad y los recibe en otra, la mensajería es esta tarifa
          fija (reemplaza a la normal, sin recargos). Cada sentido va por separado; si falta, ese pedido no se
          acepta.
        </p>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2 font-medium">Negocios de → entrega en</th>
            <th className="px-4 py-2 font-medium">Mensajería</th>
            <th className="px-4 py-2 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading && (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                Cargando…
              </td>
            </tr>
          )}
          {!isLoading && routes.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                Todavía no hay tarifas: no se aceptan pedidos entre localidades.
              </td>
            </tr>
          )}
          {routes.map((route) => (
            <DeliveryRouteRow
              key={`${route.originCity.id}-${route.destinationCity.id}-${route.fee}`}
              route={route}
            />
          ))}
        </tbody>
      </table>

      <div className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-4 sm:items-end">
        <FormSelect label="Negocios de" value={originCityId} onChange={(e) => setOriginCityId(e.target.value)}>
          <option value="">Elige…</option>
          {active.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </FormSelect>
        <FormSelect label="Entrega en" value={destinationCityId} onChange={(e) => setDestinationCityId(e.target.value)}>
          <option value="">Elige…</option>
          {active
            .filter((city) => city.id !== originCityId)
            .map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
        </FormSelect>
        <FormField
          label="Mensajería (CUP)"
          type="number"
          min={1}
          step={50}
          value={fee}
          onChange={(e) => setFee(e.target.value)}
        />
        <Button type="button" isLoading={isSaving} onClick={add}>
          Guardar tarifa
        </Button>
      </div>
      <p className="text-xs text-slate-400">
        Ejemplo: Güira de Melena → San Antonio de los Baños = {formatCup(1500)} cuando el pedido es de un negocio de
        Güira y se entrega en San Antonio.
      </p>
    </section>
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

      <DeliveryRoutesPanel cities={cities} />

      {creating && <CreateCityModal onClose={() => setCreating(false)} />}
      {configuring && <CityConfigModal city={configuring} onClose={() => setConfiguring(null)} />}
    </div>
  );
}
