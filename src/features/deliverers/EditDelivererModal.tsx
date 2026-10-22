import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { FormSelect } from '@/components/ui/FormSelect';
import { Modal } from '@/components/ui/Modal';
import { CityMultiSelect } from '@/features/cities/CityMultiSelect';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { DELIVERER_VEHICLES, DELIVERER_VEHICLE_LABELS, type DelivererDTO, type DelivererVehicle } from '@/lib/types';
import { useUpdateDelivererMutation } from './deliverersApi';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || (v.length >= 6 && v.length <= 30), 'Debe tener entre 6 y 30 caracteres'),
  vehicle: z.enum(['BICYCLE', 'ELECTRIC_MOTO', 'TRICYCLE', 'CAR']),
  commissionPercentage: z
    .string()
    .optional()
    .refine((v) => !v || (Number(v) >= 0 && Number(v) <= 100), 'Debe estar entre 0 y 100'),
});

type FormValues = z.infer<typeof schema>;

interface EditDelivererModalProps {
  deliverer: DelivererDTO;
  onClose: () => void;
}

export function EditDelivererModal({ deliverer, onClose }: EditDelivererModalProps) {
  const [updateDeliverer, { isLoading, error }] = useUpdateDelivererMutation();
  const [cityIds, setCityIds] = useState<string[]>((deliverer.cities ?? []).map((c) => c.id));

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: deliverer.name,
      phone: deliverer.phone ?? '',
      vehicle: deliverer.vehicle ?? 'BICYCLE',
      commissionPercentage: deliverer.commissionPercentage?.toString() ?? '',
    },
  });

  async function onSubmit(values: FormValues) {
    await updateDeliverer({
      id: deliverer.id,
      body: {
        name: values.name,
        phone: values.phone || undefined,
        vehicle: values.vehicle as DelivererVehicle,
        commissionPercentage: values.commissionPercentage
          ? Number(values.commissionPercentage)
          : null,
        ...(deliverer.cities !== undefined ? { cityIds } : {}),
      },
    }).unwrap();
    onClose();
  }

  return (
    <Modal title="Editar mensajero" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label="Nombre" error={errors.name?.message} {...register('name')} />
        <FormField label="Teléfono" error={errors.phone?.message} {...register('phone')} />
        <FormSelect label="Vehículo" error={errors.vehicle?.message} {...register('vehicle')}>
          {DELIVERER_VEHICLES.map((vehicle) => (
            <option key={vehicle} value={vehicle}>
              {DELIVERER_VEHICLE_LABELS[vehicle]}
            </option>
          ))}
        </FormSelect>
        <FormField
          label="% Comisión propio"
          type="number"
          min={0}
          max={100}
          step="0.01"
          placeholder={`Vacío = ${deliverer.effectiveCommissionPercentage}% por defecto del sistema`}
          error={errors.commissionPercentage?.message}
          {...register('commissionPercentage')}
        />
        <CityMultiSelect
          label="Ciudades donde opera"
          value={cityIds}
          onChange={setCityIds}
          emptyHint="Sin elegir ninguna: sin ciudad asignada todavía."
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
