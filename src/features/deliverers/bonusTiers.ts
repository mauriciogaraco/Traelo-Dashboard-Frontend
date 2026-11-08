// Tramos del bono semanal de mensajeros. Espejo de deliverer-bonus-rules.ts en el backend (que es
// quien calcula el bono): solo sirven para explicar "qué le falta para el siguiente tramo". Si
// cambian allá, hay que cambiarlos acá.

export const MAX_BONUS_PCT = 11;

export const VOLUME_TIERS: ReadonlyArray<{ min: number; pct: number }> = [
  { min: 2000, pct: 2 },
  { min: 4000, pct: 3 },
  { min: 7000, pct: 4 },
  { min: 10000, pct: 5 },
  { min: 14000, pct: 6 },
];

export const ACTION_TIERS: ReadonlyArray<{ min: number; pct: number }> = [
  { min: 3, pct: 1 },
  { min: 6, pct: 2 },
  { min: 10, pct: 3 },
];

export interface NextTier {
  // Lo que le falta (CUP de servicio o reseñas) para llegar al siguiente tramo.
  missing: number;
  // Puntos de % que sumaría ese tramo (respecto al actual).
  gainPct: number;
}

function nextTier(
  tiers: ReadonlyArray<{ min: number; pct: number }>,
  value: number,
  currentPct: number,
): NextTier | null {
  const next = tiers.find((tier) => value < tier.min);
  return next ? { missing: next.min - value, gainPct: next.pct - currentPct } : null;
}

export const nextVolumeTier = (service: number, currentPct: number) =>
  nextTier(VOLUME_TIERS, service, currentPct);

export const nextActionTier = (reviews: number, currentPct: number) =>
  nextTier(ACTION_TIERS, reviews, currentPct);
