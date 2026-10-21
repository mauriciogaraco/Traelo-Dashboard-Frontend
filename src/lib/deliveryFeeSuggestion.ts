// Mensajería SUGERIDA para un pedido armado a mano. Es la misma regla que aplica el backend a los
// pedidos de la app/web (delivery-fee-calculator.ts + night-surcharge.ts), para que el staff no tenga
// que acordarse de los recargos: tarifa base = la más alta entre los negocios, +100 por cada negocio
// extra, recargo nocturno en dos tramos (+100 desde las 7 pm y otros +100 desde las 9 pm, hora de La
// Habana) y +100 por volumen (base 250 y productos por encima de 10.000). Es solo una sugerencia: el
// staff puede cambiarla.

const EXTRA_BUSINESS_SURCHARGE = 100;
const EVENING_START_HOUR = 19;
const NIGHT_START_HOUR = 21;
const NIGHT_STEP = 100;
const VOLUME_SURCHARGE = 100;
const VOLUME_BASE_RATE = 250;
const VOLUME_MIN_SUBTOTAL = 10_000;

export interface DeliveryFeeSuggestion {
  total: number;
  base: number;
  extraBusinesses: number;
  /** Recargo por negocios adicionales (ya multiplicado). */
  extraBusinessesFee: number;
  /** Recargo nocturno total (0, 100 o 200). */
  nightFee: number;
  volumeFee: number;
}

/** Hora (0-23) en La Habana, que es la que usa el backend para el recargo nocturno. */
export function havanaHour(date: Date): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Havana',
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return Number(hour);
}

export function suggestDeliveryFee(params: {
  deliveryFeeBases: number[];
  productsSubtotal: number;
  now: Date;
}): DeliveryFeeSuggestion | null {
  const { deliveryFeeBases, productsSubtotal, now } = params;
  if (deliveryFeeBases.length === 0) return null;

  const base = Math.max(...deliveryFeeBases);
  const extraBusinesses = deliveryFeeBases.length - 1;
  const extraBusinessesFee = EXTRA_BUSINESS_SURCHARGE * extraBusinesses;
  const hour = havanaHour(now);
  const nightFee =
    (hour >= EVENING_START_HOUR ? NIGHT_STEP : 0) + (hour >= NIGHT_START_HOUR ? NIGHT_STEP : 0);
  const volumeFee =
    base === VOLUME_BASE_RATE && productsSubtotal > VOLUME_MIN_SUBTOTAL ? VOLUME_SURCHARGE : 0;

  return {
    total: base + extraBusinessesFee + nightFee + volumeFee,
    base,
    extraBusinesses,
    extraBusinessesFee,
    nightFee,
    volumeFee,
  };
}

/** "base 250 + 100 por negocio extra + 200 recargo nocturno" — para mostrar de dónde sale la sugerencia. */
export function describeDeliveryFeeSuggestion(s: DeliveryFeeSuggestion): string {
  const parts = [`base ${s.base}`];
  if (s.extraBusinessesFee > 0) {
    parts.push(
      `${s.extraBusinessesFee} por ${s.extraBusinesses === 1 ? 'negocio extra' : `${s.extraBusinesses} negocios extra`}`,
    );
  }
  if (s.nightFee > 0) parts.push(`${s.nightFee} de recargo nocturno`);
  if (s.volumeFee > 0) parts.push(`${s.volumeFee} por volumen`);
  return parts.join(' + ');
}
