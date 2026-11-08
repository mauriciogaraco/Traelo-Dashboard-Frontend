import { Controller, useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { FormField } from '@/components/ui/FormField';
import { Switch } from '@/components/ui/Switch';

/** Campos del formulario para el precio por cantidad (mayorista). Se mezclan en el schema del modal. */
export const bulkPriceShape = {
  bulkEnabled: z.boolean(),
  bulkMinQuantity: z.string(),
  bulkPrice: z.string(),
};

/** Valida que, con el switch activo, la cantidad mínima y el precio sean válidos. */
export function refineBulkPrice(
  v: { bulkEnabled: boolean; bulkMinQuantity: string; bulkPrice: string; price?: string },
  ctx: z.RefinementCtx,
) {
  if (!v.bulkEnabled) return;
  if (!(Number.isInteger(Number(v.bulkMinQuantity)) && Number(v.bulkMinQuantity) >= 2)) {
    ctx.addIssue({ code: 'custom', path: ['bulkMinQuantity'], message: 'Entero ≥ 2' });
  }
  if (!v.bulkPrice || !(Number(v.bulkPrice) > 0)) {
    ctx.addIssue({ code: 'custom', path: ['bulkPrice'], message: 'Debe ser mayor a 0' });
  } else if (v.price && Number(v.bulkPrice) >= Number(v.price)) {
    ctx.addIssue({
      code: 'custom',
      path: ['bulkPrice'],
      message: 'Debe ser menor al precio normal',
    });
  }
}

/** Convierte los valores del formulario al par que espera la API (null = desactivado). */
export function bulkPriceToApi(v: {
  bulkEnabled: boolean;
  bulkMinQuantity: string;
  bulkPrice: string;
}) {
  return v.bulkEnabled
    ? { bulkMinQuantity: Number(v.bulkMinQuantity), bulkPrice: Number(v.bulkPrice) }
    : { bulkMinQuantity: null, bulkPrice: null };
}

interface BulkFormShape {
  bulkEnabled: boolean;
  bulkMinQuantity: string;
  bulkPrice: string;
}

export function BulkPriceFields() {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = useFormContext<BulkFormShape>();
  const enabled = watch('bulkEnabled');

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3">
      <Controller
        control={control}
        name="bulkEnabled"
        render={({ field }) => (
          <Switch checked={field.value} onChange={field.onChange} label="Precio por cantidad" />
        )}
      />
      {enabled && (
        <>
          <p className="text-xs text-slate-500">
            Ej.: 800 CUP normal, y a partir de 30 unidades 600 CUP cada una.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Cantidad mínima"
              type="number"
              min={2}
              step="1"
              error={errors.bulkMinQuantity?.message}
              {...register('bulkMinQuantity')}
            />
            <FormField
              label="Precio por unidad"
              type="number"
              min={0}
              step="0.01"
              error={errors.bulkPrice?.message}
              {...register('bulkPrice')}
            />
          </div>
        </>
      )}
    </div>
  );
}
