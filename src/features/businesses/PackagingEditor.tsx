import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { EditorSection } from './VariantEditors';
import { listError } from './variantForm';

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
 * Empaque = el envase en el que va el producto (Termopack, Caja, Jaba…), entre los que elige el cliente.
 * Es distinto de los tipos/sabores y de los agregos (ver VariantEditors.tsx).
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
    <EditorSection
      title="Empaque"
      description="El envase en el que va el producto (ej. Termopack, Caja, Jaba); el cliente elige uno. Precio 0 = sin empaque. Capacidad (opcional) = cuántas unidades caben en un empaque; sin ella se cobra un empaque por unidad."
      error={listError(errors.packaging)}
      action={
        <Button
          type="button"
          variant="secondary"
          onClick={() => append({ name: '', price: '', capacity: '' })}
          disabled={fields.length >= 10}
        >
          Añadir empaque
        </Button>
      }
    >
      {fields.length === 0 && <p className="text-xs text-slate-500">Este producto no lleva empaque.</p>}
      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_auto] items-end gap-2">
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
    </EditorSection>
  );
}
