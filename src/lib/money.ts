import type { PriceCurrency } from './types';

/** "1750 CUP" o "$3.5 USD"; "—" si no hay precio. */
export function formatPrice(value: number | null | undefined, currency: PriceCurrency = 'CUP'): string {
  if (value === null || value === undefined) return '—';
  return currency === 'USD' ? `$${value} USD` : `${value} CUP`;
}

/** Lo que se cobra en CUP por un precio en USD (misma regla del servidor: tasa × precio, al CUP entero). */
export function usdToCup(usd: number, rate: number): number {
  return Math.round(usd * rate);
}

/** "$3.5 USD ≈ 1715 CUP" (con la tasa vigente); sin tasa, solo el precio. */
export function formatPriceWithCup(value: number | null | undefined, currency: PriceCurrency, rate?: number): string {
  const base = formatPrice(value, currency);
  if (currency !== 'USD' || value === null || value === undefined || !rate) return base;
  return `${base} ≈ ${usdToCup(value, rate)} CUP`;
}
