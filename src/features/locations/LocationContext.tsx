import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useAppSelector } from '@/app/hooks';

const STORAGE_KEY = 'traelo.activeLocation';

export type ActiveLocationId = string | 'ALL';

interface LocationContextValue {
  /** [] = sin restricción (acceso global) — mismo dato que auth.user.cities del backend. */
  authorizedLocations: { id: string; name: string }[];
  canViewAll: boolean;
  activeLocationId: ActiveLocationId | null;
  setActiveLocationId: (id: ActiveLocationId) => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

/**
 * Ámbito de ciudad del usuario actual. Hoy no tiene nada que mostrar para casi nadie: `OWNER`
 * siempre, y cualquier `ADMIN`/`EMPLOYEE` sin ciudades asignadas, llegan con `cities: []`
 * (acceso global) — exactamente lo mismo que antes de que existiera multiciudad. El selector en
 * `LocationSelector.tsx` se mantiene oculto hasta que algún módulo real acepte filtrar por
 * ciudad (hoy Negocios/Pedidos escalan el ámbito automáticamente en el servidor, sin que el
 * cliente mande nada — ver audit/expansion-multiciudad en el backend).
 */
export function LocationProvider({ children }: { children: ReactNode }) {
  const user = useAppSelector((state) => state.auth.user);
  const authorizedLocations = user?.cities ?? [];
  const canViewAll = authorizedLocations.length === 0;

  const [activeLocationId, setActiveLocationIdState] = useState<ActiveLocationId | null>(null);

  // Valida la preferencia guardada contra lo realmente autorizado — nunca se trata como un
  // permiso. Si no coincide con nada autorizado, usa la primera localidad autorizada (o null si
  // el usuario tiene acceso global y no hay nada que elegir).
  useEffect(() => {
    if (!user) {
      setActiveLocationIdState(null);
      return;
    }
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      saved = null;
    }
    const isValid =
      saved !== null &&
      (saved === 'ALL' ? canViewAll : authorizedLocations.some((loc) => loc.id === saved));
    setActiveLocationIdState(isValid ? (saved as ActiveLocationId) : authorizedLocations[0]?.id ?? null);
  }, [user, canViewAll, authorizedLocations]);

  function setActiveLocationId(id: ActiveLocationId) {
    setActiveLocationIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Sin persistencia no se rompe nada: la próxima carga vuelve a validar y elige una por defecto.
    }
  }

  const value = useMemo<LocationContextValue>(
    () => ({ authorizedLocations, canViewAll, activeLocationId, setActiveLocationId }),
    [authorizedLocations, canViewAll, activeLocationId],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useActiveLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error('useActiveLocation debe usarse dentro de <LocationProvider>');
  }
  return ctx;
}
