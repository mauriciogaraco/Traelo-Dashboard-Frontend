import { useActiveLocation } from './LocationContext';

/**
 * Oculto salvo que haya más de una localidad/vista global autorizada para el usuario actual —
 * ver LocationContext.tsx. Hoy nadie tiene más de una (una sola ciudad activa, nadie con
 * UserCityAccess todavía), así que esto no renderiza nada para nadie: se activa solo cuando el
 * backend dé de alta una segunda ciudad o restrinja a algún ADMIN/EMPLOYEE a una ciudad puntual.
 */
export function LocationSelector() {
  const { authorizedLocations, canViewAll, activeLocationId, setActiveLocationId } =
    useActiveLocation();

  const selectableCount = authorizedLocations.length + (canViewAll ? 1 : 0);
  if (selectableCount <= 1) return null;

  return (
    <select
      value={activeLocationId ?? ''}
      onChange={(e) => setActiveLocationId(e.target.value)}
      aria-label="Localidad activa"
      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-600 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
    >
      {canViewAll && <option value="ALL">Todas las localidades</option>}
      {authorizedLocations.map((location) => (
        <option key={location.id} value={location.id}>
          {location.name}
        </option>
      ))}
    </select>
  );
}
