import type { Time, UTCTimestamp } from 'lightweight-charts';
import type { OrdersTrendGranularity } from '@/lib/types';

// "day"/"week" ya vienen como "YYYY-MM-DD" (semana = lunes de esa semana ISO); "month" viene
// como "YYYY-MM" — hay que completarlo a un día real para ubicarlo en el eje de tiempo.
export function labelToTime(label: string, granularity: OrdersTrendGranularity): UTCTimestamp {
  const iso = granularity === 'month' ? `${label}-01` : label;
  return (Date.parse(`${iso}T00:00:00Z`) / 1000) as UTCTimestamp;
}

// Inverso de labelToTime — lightweight-charts devuelve el time como número (o BusinessDay) en
// sus callbacks, nunca el string original, así que hay que reconstruir la misma clave.
export function timeToLabelKey(time: Time, granularity: OrdersTrendGranularity): string {
  const date = new Date(Number(time) * 1000);
  const iso = date.toISOString();
  return granularity === 'month' ? iso.slice(0, 7) : iso.slice(0, 10);
}

const MONTH_NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatTrendLabel(label: string, granularity: OrdersTrendGranularity): string {
  if (granularity === 'month') {
    const [year, month] = label.split('-');
    return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
  }
  const [year, month, day] = label.split('-');
  return `${granularity === 'week' ? 'Semana del ' : ''}${day}/${month}/${year}`;
}
