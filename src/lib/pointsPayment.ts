import type { OrderDTO, OrderItemDTO } from '@/lib/types';

// Pago con puntos: 1 punto = 1 CUP y un producto se paga completo. Los puntos cubren solo productos
// (nunca mensajería ni Servicio Tráelo) y el negocio cobra su precio íntegro: lo pagado con puntos
// lo absorbe Tráelo. Los montos los calcula el servidor; acá solo se leen y se derivan sumas triviales.

const num = (value: number | null | undefined) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

export function isItemPaidWithPoints(item: Pick<OrderItemDTO, 'pointsUnits' | 'pointsDiscount'>): boolean {
  return num(item.pointsUnits) > 0 || num(item.pointsDiscount) > 0;
}

export function hasPointsPayment(order: Pick<OrderDTO, 'pointsRedeemed' | 'pointsDiscount'>): boolean {
  return num(order.pointsRedeemed) > 0 || num(order.pointsDiscount) > 0;
}

export interface PointsPaymentSummary {
  /** Total antes del canje: productos + mensajería + Servicio Tráelo. */
  totalBeforePoints: number;
  pointsSpent: number;
  /** CUP de productos cubiertos con puntos. */
  coveredByPoints: number;
  /** Lo que el cliente paga en efectivo. */
  toCollect: number;
  /** Lo que los negocios cobran (su precio íntegro): no baja por los puntos. */
  owedToBusinesses: number;
  /** Los productos quedaron 100% pagados con puntos: el cliente solo paga mensajería y servicio. */
  productsFullyPaid: boolean;
}

export function getPointsPaymentSummary(order: OrderDTO): PointsPaymentSummary {
  const coveredByPoints = num(order.pointsDiscount);
  const toCollect = num(order.total);
  const productsTotal = num(order.productsTotal);
  return {
    totalBeforePoints: order.totalBeforeRedemption != null ? num(order.totalBeforeRedemption) : toCollect + coveredByPoints,
    pointsSpent: num(order.pointsRedeemed),
    coveredByPoints,
    toCollect,
    owedToBusinesses: productsTotal,
    productsFullyPaid: productsTotal > 0 && coveredByPoints >= productsTotal,
  };
}
