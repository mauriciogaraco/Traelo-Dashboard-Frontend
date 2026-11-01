import type { OrderDTO, OrderItemDTO } from '@/lib/types';

// Un pedido puede mezclar productos en USD y en CUP. El servidor guarda todo en CUP (unitPrice,
// subtotal) y, en las líneas de productos en USD, el precio en USD y la tasa con que se convirtió.
// Acá solo se leen esos datos y se suman por moneda; nada se recalcula distinto al servidor.

const round2 = (value: number) => Math.round(value * 100) / 100;

export function isUsdItem(item: Pick<OrderItemDTO, 'unitPriceUsd'>): boolean {
  return item.unitPriceUsd != null && item.unitPriceUsd > 0;
}

/** Subtotal de la línea en USD (cantidad × precio en USD), o null si la línea es en CUP. */
export function itemSubtotalUsd(item: Pick<OrderItemDTO, 'unitPriceUsd' | 'quantity'>): number | null {
  return item.unitPriceUsd != null && item.unitPriceUsd > 0 ? round2(item.quantity * item.unitPriceUsd) : null;
}

export interface CurrencyBreakdown {
  /** Hay al menos una línea en USD. */
  hasUsd: boolean;
  /** Suma en USD de las líneas en USD. */
  usdTotal: number;
  /** Esas mismas líneas, ya convertidas a CUP. */
  usdInCup: number;
  /** El resto del subtotal de productos (líneas en CUP y envases). */
  cupTotal: number;
}

export function getCurrencyBreakdown(order: OrderDTO): CurrencyBreakdown {
  let usdTotal = 0;
  let usdInCup = 0;
  for (const item of order.businesses.flatMap((business) => business.items)) {
    const usd = itemSubtotalUsd(item);
    if (usd === null) continue;
    usdTotal += usd;
    usdInCup += item.subtotal;
  }
  return {
    hasUsd: usdTotal > 0,
    usdTotal: round2(usdTotal),
    usdInCup: round2(usdInCup),
    cupTotal: round2(order.productsTotal - usdInCup),
  };
}

export function formatUsd(value: number): string {
  return `$${value.toLocaleString('es', { maximumFractionDigits: 2 })} USD`;
}
