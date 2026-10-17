import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useListCitiesQuery } from '@/features/cities/citiesApi';
import { baseApi } from '@/lib/baseApi';
import { Role } from '@/lib/types';
import { setActiveCityId } from './activeCity';
import { LocationChooserModal } from './LocationChooserModal';

const STORAGE_PREFIX = 'traelo.activeLocation';

export type ActiveLocationId = string | 'ALL';

export interface LocationOption {
  id: string;
  name: string;
}

interface LocationContextValue {
  /** Ciudades que el usuario puede elegir (las suyas, o todas las activas si tiene acceso global). */
  locations: LocationOption[];
  /** Acceso global: puede elegir "Todas las ciudades". */
  canViewAll: boolean;
  activeLocationId: ActiveLocationId | null;
  activeLocationName: string;
  /** Hay algo que elegir (2+ opciones): muestra el botón de ciudad del topbar. */
  canChoose: boolean;
  /** Ya se sabe la ciudad activa: recién entonces el dashboard puede pedir datos. */
  isResolved: boolean;
  openChooser: () => void;
  setActiveLocationId: (id: ActiveLocationId) => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

// Roles de staff que ven varias ciudades; mensajeros, dueños de negocio y comerciales ya llegan
// acotados por el backend y no filtran desde acá.
const STAFF_ROLES: string[] = [Role.OWNER, Role.ADMIN, Role.EMPLOYEE];

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

function readSaved(userId: string): string | null {
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

/**
 * Ciudad activa del dashboard. Con una sola ciudad no hay nada que elegir y todo funciona como
 * siempre. Con 2+, el usuario elige en un modal (bloqueante la primera vez) y cada listado se
 * filtra por esa ciudad; "Todas" (solo acceso global) no manda filtro. La selección guardada se
 * valida contra lo realmente autorizado: nunca se trata como un permiso.
 */
export function LocationProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isStaff = !!user && STAFF_ROLES.includes(user.role);
  const scoped = useMemo(() => user?.cities ?? [], [user]);
  const canViewAll = isStaff && scoped.length === 0;

  const {
    data: citiesData,
    isLoading: citiesLoading,
    isError: citiesError,
  } = useListCitiesQuery({ active: true, pageSize: 100 }, { skip: !canViewAll });

  const locations = useMemo<LocationOption[]>(() => {
    if (!isStaff) return [];
    if (!canViewAll) return scoped.map((c) => ({ id: c.id, name: c.name }));
    return (citiesData?.data ?? []).map((c) => ({ id: c.id, name: c.name }));
  }, [isStaff, canViewAll, scoped, citiesData]);

  // Elección hecha en esta sesión (por usuario); si no hay, se usa la guardada.
  const [override, setOverride] = useState<{ userId: string; id: ActiveLocationId } | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);

  const selectedRaw = user
    ? override?.userId === user.id
      ? override.id
      : readSaved(user.id)
    : null;
  const selectedValid =
    selectedRaw !== null &&
    (selectedRaw === 'ALL' ? canViewAll : locations.some((loc) => loc.id === selectedRaw));

  // Sin nada que elegir: una sola opción se toma sola. Si no se pudo cargar la lista de ciudades,
  // se cae a "Todas" (como antes de multiciudad) en vez de dejar al usuario sin acceso.
  const stillLoading = canViewAll && citiesLoading;
  const canChoose = locations.length + (canViewAll ? 1 : 0) > 1 && !(canViewAll && citiesError);
  let activeLocationId: ActiveLocationId | null = null;
  if (selectedValid) {
    activeLocationId = selectedRaw as ActiveLocationId;
  } else if (user && isStaff && !stillLoading && !canChoose) {
    activeLocationId = canViewAll ? 'ALL' : (locations[0]?.id ?? null);
  }

  const isResolved = !user || !isStaff || activeLocationId !== null;
  const needsChoice = !!user && isStaff && !stillLoading && !isResolved;

  // Lo lee baseApi al armar cada request. Se asigna en el render (idempotente) para que ninguna
  // consulta de los hijos salga con la ciudad anterior.
  setActiveCityId(isStaff && activeLocationId && activeLocationId !== 'ALL' ? activeLocationId : null);

  const setActiveLocationId = useCallback(
    (id: ActiveLocationId) => {
      if (!user) return;
      try {
        localStorage.setItem(storageKey(user.id), id);
      } catch {
        // Sin persistencia no se rompe nada: la próxima carga vuelve a pedir la ciudad.
      }
      setActiveCityId(id === 'ALL' ? null : id);
      setOverride({ userId: user.id, id });
      setChooserOpen(false);
      // Descarta lo cacheado de la ciudad anterior: los listados se vuelven a pedir ya filtrados.
      dispatch(baseApi.util.resetApiState());
    },
    [user, dispatch],
  );

  const openChooser = useCallback(() => setChooserOpen(true), []);

  const activeLocationName =
    activeLocationId === 'ALL'
      ? 'Todas las ciudades'
      : (locations.find((loc) => loc.id === activeLocationId)?.name ?? '');

  const value = useMemo<LocationContextValue>(
    () => ({
      locations,
      canViewAll,
      activeLocationId,
      activeLocationName,
      canChoose,
      isResolved,
      openChooser,
      setActiveLocationId,
    }),
    [
      locations,
      canViewAll,
      activeLocationId,
      activeLocationName,
      canChoose,
      isResolved,
      openChooser,
      setActiveLocationId,
    ],
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
      {(needsChoice || chooserOpen) && (
        <LocationChooserModal
          locations={locations}
          canViewAll={canViewAll}
          activeLocationId={activeLocationId}
          // La primera elección es obligatoria: sin ella no hay ciudad contra la cual filtrar.
          onClose={needsChoice ? undefined : () => setChooserOpen(false)}
          onSelect={setActiveLocationId}
        />
      )}
    </LocationContext.Provider>
  );
}

export function useActiveLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error('useActiveLocation debe usarse dentro de <LocationProvider>');
  }
  return ctx;
}
