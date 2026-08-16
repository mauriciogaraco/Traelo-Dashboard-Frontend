import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { FormSelect } from '@/components/ui/FormSelect';
import { Modal } from '@/components/ui/Modal';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { COMMISSION_TYPE_LABEL } from '@/lib/labels';
import { CommissionType } from '@/lib/types';
import { useCreateBusinessMutation } from './businessesApi';

const schema = z
  .object({
    name: z.string().min(2, 'Mínimo 2 caracteres').max(150),
    phone: z.string().min(6, 'Mínimo 6 caracteres').max(30),
    address: z.string().min(3, 'Mínimo 3 caracteres').max(300),
    commissionType: z.enum(CommissionType),
    commissionPercentage: z.string().optional(),
    defaultProductCommissionAmount: z.string().optional(),
  })
  .refine(
    (data) =>
      data.commissionType !== 'PERCENTAGE' ||
      (data.commissionPercentage !== '' &&
        Number(data.commissionPercentage) >= 0 &&
        Number(data.commissionPercentage) <= 100),
    {
      message: 'Requerido, entre 0 y 100',
      path: ['commissionPercentage'],
    },
  )
  .refine(
    (data) =>
      data.commissionType !== 'FIXED_PER_PRODUCT' ||
      (data.defaultProductCommissionAmount !== '' &&
        Number(data.defaultProductCommissionAmount) >= 0),
    {
      message: 'Requerido, mayor o igual a 0',
      path: ['defaultProductCommissionAmount'],
    },
  );

type FormValues = z.infer<typeof schema>;

interface CreateBusinessModalProps {
  onClose: () => void;
}

export function CreateBusinessModal({ onClose }: CreateBusinessModalProps) {
  const [createBusiness, { isLoading, error }] = useCreateBusinessMutation();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      phone: '',
      address: '',
      commissionType: 'PERCENTAGE',
      commissionPercentage: '',
      defaultProductCommissionAmount: '',
    },
  });

  const commissionType = watch('commissionType');

  async function onSubmit(values: FormValues) {
    await createBusiness({
      name: values.name,
      phone: values.phone,
      address: values.address,
      commissionType: values.commissionType,
      commissionPercentage:
        values.commissionType === 'PERCENTAGE' ? Number(values.commissionPercentage) : undefined,
      defaultProductCommissionAmount:
        values.commissionType === 'FIXED_PER_PRODUCT'
          ? Number(values.defaultProductCommissionAmount)
          : undefined,
    }).unwrap();
    onClose();
  }

  return (
    <Modal title="Nuevo negocio" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label="Nombre" error={errors.name?.message} {...register('name')} />
        <FormField label="Teléfono" error={errors.phone?.message} {...register('phone')} />
        <FormField label="Dirección" error={errors.address?.message} {...register('address')} />
        <FormSelect
          label="Modelo de comisión"
          error={errors.commissionType?.message}
          {...register('commissionType')}
        >
          {Object.values(CommissionType).map((type) => (
            <option key={type} value={type}>
              {COMMISSION_TYPE_LABEL[type]}
            </option>
          ))}
        </FormSelect>
        {commissionType === 'PERCENTAGE' ? (
          <FormField
            label="% Comisión sobre ventas"
            type="number"
            min={0}
            max={100}
            step="0.01"
            error={errors.commissionPercentage?.message}
            {...register('commissionPercentage')}
          />
        ) : (
          <FormField
            label="Monto fijo por producto (CUP)"
            type="number"
            min={0}
            step="0.01"
            error={errors.defaultProductCommissionAmount?.message}
            {...register('defaultProductCommissionAmount')}
          />
        )}
        {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Crear negocio
          </Button>
        </div>
      </form>
    </Modal>
  );
}
