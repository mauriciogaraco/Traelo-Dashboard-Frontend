// Ciudad activa para los listados del dashboard. Vive fuera de React para que baseApi (que corre
// fuera de los componentes) pueda leerla al armar cada request; LocationProvider la mantiene al día.
// null = "Todas las ciudades" (o un usuario que no filtra): no se manda ningún filtro.
let activeCityId: string | null = null;

export function getActiveCityId(): string | null {
  return activeCityId;
}

export function setActiveCityId(id: string | null): void {
  activeCityId = id;
}

// Solo los listados/resúmenes que el backend acota con ?cityId. No incluye detalles por id: un
// recurso de otra ciudad abierto por enlace directo no debería fallar por el filtro.
const FILTERED_PATHS = new Set([
  '/orders',
  '/deliverers',
  '/deliverers/queue',
  '/deliverers/bonuses',
  '/businesses',
  '/products',
  '/dashboard/summary',
  '/reports/sales',
  '/reports/top-businesses',
  '/reports/top-deliverers',
  '/reports/top-products',
  '/reports/businesses',
  '/reports/deliverers',
  '/reports/customers',
]);

export function isCityFilteredPath(url: string): boolean {
  const path = url.split('?')[0] ?? url;
  return FILTERED_PATHS.has(path) || path.startsWith('/analytics/');
}
