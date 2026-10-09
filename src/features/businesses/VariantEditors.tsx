import type { ReactNode } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { listError, type VariantsFormShape } from './variantForm';

// Un producto tiene cuatro cosas distintas que el cliente puede elegir o que cambian cómo se vende. En el
// editor van en bloques separados y rotulados, cada uno con una línea que explica para qué sirve:
//  - Tipos o sabores  (options)   : variantes a elegir (Fresa, Natural). NO cambian el precio.
//  - Agregos          (addons)    : extras opcionales con precio POR UNIDAD (Queso +200). Uno por línea.
//  - Empaque          (packaging) : el envase (Termopack, Caja), con precio y, si quieres, capacidad.
//  - Unidades por caja (formato)  : solo si se vende por caja completa.

interface EditorSectionProps {
  title: string;
  description: string;
  action?: ReactNode;
  error?: string;
  children: ReactNode;
}

/** Caja con título, explicación y, a la derecha, el botón de añadir. */
export function EditorSection({ title, description, action, error, children }: EditorSectionProps) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
        {action && <div className="shrink-0 [&>button]:whitespace-nowrap">{action}</div>}
      </div>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  );
}

export function OptionsEditor() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<VariantsFormShape>();
  const { fields, append, remove } = useFieldArray({ control, name: 'options' });

  return (
    <EditorSection
      title="Tipos o sabores"
      description="Variantes entre las que elige el cliente (ej. Fresa, Natural). No cambian el precio."
      error={listError(errors.options)}
      action={
        <Button type="button" variant="secondary" onClick={() => append({ name: '' })} disabled={fields.length >= 30}>
          Añadir tipo
        </Button>
      }
    >
      {fields.length === 0 && <p className="text-xs text-slate-500">Este producto no tiene tipos ni sabores.</p>}
      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <FormField
            label="Nombre"
            placeholder="Ej. Fresa"
            error={errors.options?.[index]?.name?.message}
            {...register(`options.${index}.name`)}
          />
          <Button type="button" variant="ghost" onClick={() => remove(index)}>
            Quitar
          </Button>
        </div>
      ))}
    </EditorSection>
  );
}

export function AddonsEditor() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<VariantsFormShape>();
  const { fields, append, remove } = useFieldArray({ control, name: 'addons' });

  return (
    <EditorSection
      title="Agregos"
      description="Extras opcionales que suman al precio, por cada unidad (ej. Queso +200). El cliente elige como mucho uno por línea del pedido."
      error={listError(errors.addons)}
      action={
        <Button
          type="button"
          variant="secondary"
          onClick={() => append({ name: '', price: '' })}
          disabled={fields.length >= 20}
        >
          Añadir agrego
        </Button>
      }
    >
      {fields.length === 0 && <p className="text-xs text-slate-500">Este producto no tiene agregos.</p>}
      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_6rem_auto] items-end gap-2">
          <FormField
            label="Nombre"
            placeholder="Ej. Queso extra"
            error={errors.addons?.[index]?.name?.message}
            {...register(`addons.${index}.name`)}
          />
          <FormField
            label="Precio por unidad"
            type="number"
            min={0}
            step="0.01"
            error={errors.addons?.[index]?.price?.message}
            {...register(`addons.${index}.price`)}
          />
          <Button type="button" variant="ghost" onClick={() => remove(index)}>
            Quitar
          </Button>
        </div>
      ))}
    </EditorSection>
  );
}

export function UnitsPerPackField() {
  const {
    register,
    formState: { errors },
  } = useFormContext<VariantsFormShape>();

  return (
    <EditorSection
      title="Unidades por caja"
      description="Solo si este producto se vende por caja o paquete completo: el precio del producto es el de la caja entera y aquí indicas cuántas unidades trae. Déjalo vacío si se vende por unidad."
    >
      <div className="max-w-[12rem]">
        <FormField
          label="Unidades en la caja"
          type="number"
          min={2}
          step="1"
          placeholder="—"
          error={errors.formato?.message}
          {...register('formato')}
        />
      </div>
    </EditorSection>
  );
}
