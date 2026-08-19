// El negocio opera solo en Cuba: las fechas siempre se muestran en hora de La Habana,
// sin importar en qué zona horaria esté configurado el dispositivo de quien las mira.
const BUSINESS_TIMEZONE = 'America/Havana';

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es', {
    timeZone: BUSINESS_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
