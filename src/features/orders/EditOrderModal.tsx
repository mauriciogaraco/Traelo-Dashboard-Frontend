import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { getErrorMessage } from '@/lib/getErrorMessage';
import type { OrderDTO } from '@/lib/types';
import { useUpdateOrderMutation } from './ordersApi';

const schema = z.object({
  customerName: z.string().min(2, 'Mínimo 2 caracteres').max(150),
  customerPhone: z.string().min(6, 'Mínimo 6 caracteres').max(30),
  customerAddress: z.string().min(3, 'Mínimo 3 caracteres').max(300),
  addressReference: z.string().max(200).optional(),
  deliveryFee: z.string().min(1, 'Requerido').refine((v) => Number(v) >= 0, 'Debe ser mayor o igual a 0'),
});

type FormValues = z.infer<typeof schema>;

interface EditOrderModalProps {
  order: OrderDTO;
  onClose: () => void;
}

export function EditOrderModal({ order, onClose }: EditOrderModalProps) {
  const [updateOrder, { isLoading, error }] = useUpdateOrderMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      addressReference: order.addressReference ?? '',
      deliveryFee: order.deliveryFee.toString(),
    },
  });

  async function onSubmit(values: FormValues) {
    await updateOrder({
      id: order.id,
      body: {
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        customerAddress: values.customerAddress,
        addressReference: values.addressReference || undefined,
        deliveryFee: Number(values.deliveryFee),
      },
    }).unwrap();
    onClose();
  }

  return (
    <Modal title="Editar pedido" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField
          label="Cliente"
          error={errors.customerName?.message}
          {...register('customerName')}
        />
        <FormField
          label="Teléfono"
          error={errors.customerPhone?.message}
          {...register('customerPhone')}
        />
        <FormField
          label="Dirección"
          error={errors.customerAddress?.message}
          {...register('customerAddress')}
        />
        <FormField
          label="Referencia (opcional)"
          error={errors.addressReference?.message}
          {...register('addressReference')}
        />
        <FormField
          label="Mensajería (CUP)"
          type="number"
          min={0}
          step="0.01"
          error={errors.deliveryFee?.message}
          {...register('deliveryFee')}
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
