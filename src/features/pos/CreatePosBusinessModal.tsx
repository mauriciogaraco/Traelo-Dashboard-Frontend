import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useListBusinessesQuery } from '@/features/businesses/businessesApi';
import { useListCitiesQuery } from '@/features/cities/citiesApi';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { useCreatePosBusinessMutation } from './posApi';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(150),
  phone: z.string().max(30),
  address: z.string().max(300),
  durationDays: z
    .string()
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 3660,
      'Entre 1 y 3660 días',
    ),
});

type FormValues = z.infer<typeof schema>;

export function CreatePosBusinessModal({ onClose }: { onClose: () => void }) {
  const [createPosBusiness, { isLoading, error }] = useCreatePosBusinessMutation();
  const [cityId, setCityId] = useState<string | null>(null);
  const [cityError, setCityError] = useState<string | undefined>();
  const [businessId, setBusinessId] = useState<string | null>(null);

  const { data: citiesData } = useListCitiesQuery({
    active: true,
    pageSize: 100,
  });
  const cityOptions = (citiesData?.data ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));
  const { data: businessesData } = useListBusinessesQuery({ pageSize: 100 });
  const businessOptions = (businessesData?.data ?? []).map((b) => ({
    value: b.id,
    label: b.name,
    sublabel: b.cityName ?? undefined,
  }));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', address: '', durationDays: '30' },
  });

  async function onSubmit(values: FormValues) {
    if (!cityId) {
      setCityError('Elegí la ciudad del negocio');
      return;
    }
    setCityError(undefined);
    await createPosBusiness({
      name: values.name.trim(),
      cityId,
      phone: values.phone.trim() || undefined,
      address: values.address.trim() || undefined,
      businessId: businessId ?? undefined,
      durationDays: Number(values.durationDays),
    }).unwrap();
    onClose();
  }

  return (
    <Modal title="Nuevo negocio POS" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <p className="-mt-2 text-xs text-slate-500">
          El negocio del POS es independiente del catálogo: puede no existir allí. Se crea con
          suscripción activa del plan estándar.
        </p>
        <FormField label="Nombre" error={errors.name?.message} {...register('name')} />
        <SearchableSelect
          label="Ciudad"
          value={cityId}
          onChange={setCityId}
          options={cityOptions}
          placeholder="Elegir ciudad…"
          error={cityError}
          allowClear={false}
        />
        <FormField
          label="Teléfono (opcional)"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <FormField
          label="Dirección (opcional)"
          error={errors.address?.message}
          {...register('address')}
        />
        <FormField
          label="Duración de la suscripción (días)"
          type="number"
          min={1}
          error={errors.durationDays?.message}
          {...register('durationDays')}
        />
        <SearchableSelect
          label="Vincular con negocio del catálogo (opcional)"
          value={businessId}
          onChange={setBusinessId}
          options={businessOptions}
          placeholder="Sin vínculo"
        />
        {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Crear negocio POS
          </Button>
        </div>
      </form>
    </Modal>
  );
}
