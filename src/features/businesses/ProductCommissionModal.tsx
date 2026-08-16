import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { getErrorMessage } from '@/lib/getErrorMessage';
import type { ProductDTO } from '@/lib/types';
import { useRemoveProductCommissionMutation, useSetProductCommissionMutation } from './businessesApi';

const schema = z.object({
  commissionAmount: z
    .string()
    .min(1, 'Requerido')
    .refine((v) => Number(v) >= 0, 'Debe ser mayor o igual a 0'),
});

type FormValues = z.infer<typeof schema>;

interface ProductCommissionModalProps {
  businessId: string;
  product: ProductDTO;
  defaultCommissionAmount: number | null;
  onClose: () => void;
}

export function ProductCommissionModal({
  businessId,
  product,
  defaultCommissionAmount,
  onClose,
}: ProductCommissionModalProps) {
  const [setCommission, { isLoading: isSaving, error }] = useSetProductCommissionMutation();
  const [removeCommission, { isLoading: isRemoving }] = useRemoveProductCommissionMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { commissionAmount: product.commission?.commissionAmount.toString() ?? '' },
  });

  async function onSubmit(values: FormValues) {
    await setCommission({
      businessId,
      productId: product.id,
      commissionAmount: Number(values.commissionAmount),
    }).unwrap();
    onClose();
  }

  async function handleRemove() {
    await removeCommission({ businessId, productId: product.id }).unwrap();
    onClose();
  }

  return (
    <Modal title={`Comisión de ${product.name}`} onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <p className="text-sm text-slate-500">
          Monto por defecto del negocio: {defaultCommissionAmount ?? '—'} CUP. Dejalo sin comisión
          propia para usar ese monto en cada venta de este producto.
        </p>
        <FormField
          label="Comisión propia (CUP)"
          type="number"
          min={0}
          step="0.01"
          error={errors.commissionAmount?.message}
          {...register('commissionAmount')}
        />
        {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}
        <div className="mt-2 flex justify-between gap-3">
          {product.commission ? (
            <Button
              type="button"
              variant="secondary"
              isLoading={isRemoving}
              onClick={handleRemove}
            >
              Quitar comisión propia
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Guardar
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
