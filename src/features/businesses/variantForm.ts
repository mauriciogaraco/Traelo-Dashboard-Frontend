// Tipos y utilidades del formulario de tipos/sabores, agregos y unidades por caja (ver VariantEditors.tsx).

export interface OptionFormRow {
  name: string;
}

export interface AddonFormRow {
  name: string;
  price: string;
}

export interface VariantsFormShape {
  options: OptionFormRow[];
  addons: AddonFormRow[];
  formato: string;
}

/** Mensaje de error de una lista completa (p. ej. "no repitas nombres"), no de una fila. */
export function listError(error: unknown): string | undefined {
  const e = error as { message?: string; root?: { message?: string } } | undefined;
  return e?.root?.message ?? e?.message;
}
