import { useListCitiesQuery } from './citiesApi';

interface CityMultiSelectProps {
  label: string;
  value: string[];
  onChange: (ids: string[]) => void;
  /** Qué significa dejarlo vacío para este recurso (se muestra como ayuda). */
  emptyHint: string;
}

/**
 * Selector de varias ciudades para alta/edición de staff y mensajeros. Igual criterio que el de
 * Negocios: con una sola ciudad activa no hay nada que elegir, así que no renderiza nada.
 */
export function CityMultiSelect({ label, value, onChange, emptyHint }: CityMultiSelectProps) {
  const { data } = useListCitiesQuery({ pageSize: 100, active: true });
  const cities = data?.data ?? [];
  if (cities.length <= 1) return null;

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium text-slate-700">{label}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {cities.map((city) => (
          <label key={city.id} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={value.includes(city.id)}
              onChange={() => toggle(city.id)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            {city.name}
          </label>
        ))}
      </div>
      {value.length === 0 && <p className="text-xs text-slate-500">{emptyHint}</p>}
    </fieldset>
  );
}
