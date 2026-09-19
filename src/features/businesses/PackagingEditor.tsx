import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';

export interface PackagingFormRow {
  name: string;
  price: string;
  capacity: string;
}

interface PackagingFormShape {
  packaging: PackagingFormRow[];
}

/**
 * Debe renderizarse dentro de un <FormProvider> cuyo formulario tenga `packaging: PackagingFormRow[]`.
 * Opciones de empaque entre las que elige el cliente (Termopack, Caja, Jaba…). Precio 0 = "sin
 * empaque". Capacidad (opcional) = unidades que caben en un empaque; sin ella se cobra uno por unidad.
 */
export function PackagingEditor() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<PackagingFormShape>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'packaging',
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Empaque (opcional)</span>
        <Button
          type="button"
          variant="secondary"
          onClick={() => append({ name: '', price: '', capacity: '' })}
          disabled={fields.length >= 10}
        >
          Añadir opción
        </Button>
      </div>
      {fields.length === 0 && (
        <p className="text-xs text-slate-500">Este producto no lleva empaque.</p>
      )}
      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-[1fr_6rem_6rem_auto] items-end gap-2">
          <FormField
            label="Nombre"
            placeholder="Ej. Termopack"
            error={errors.packaging?.[index]?.name?.message}
            {...register(`packaging.${index}.name`)}
          />
          <FormField
            label="Precio"
            type="number"
            min={0}
            step="0.01"
            error={errors.packaging?.[index]?.price?.message}
            {...register(`packaging.${index}.price`)}
          />
          <FormField
            label="Capacidad"
            type="number"
            min={1}
            step="1"
            placeholder="—"
            error={errors.packaging?.[index]?.capacity?.message}
            {...register(`packaging.${index}.capacity`)}
          />
          <Button type="button" variant="ghost" onClick={() => remove(index)}>
            Quitar
          </Button>
        </div>
      ))}
    </div>
  );
}
