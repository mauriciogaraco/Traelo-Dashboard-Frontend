import type { FamiliaOrderDTO, FamiliaStatus, FamiliaZone } from './familiaApi';

export const STATUS_LABELS: Record<FamiliaStatus, string> = {
  PENDING: 'Pendiente',
  ASSIGNED: 'Asignado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

export const STATUS_TONES: Record<FamiliaStatus, 'amber' | 'brand' | 'green' | 'slate'> = {
  PENDING: 'amber',
  ASSIGNED: 'brand',
  COMPLETED: 'green',
  CANCELLED: 'slate',
};

export const ZONE_LABELS: Record<FamiliaZone, string> = {
  GUIRA: 'Güira de Melena',
  SAN_ANTONIO: 'San Antonio de los Baños',
  OTHER: 'Otro lugar',
};

export function formatUsd(value: number): string {
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

export function zoneText(order: Pick<FamiliaOrderDTO, 'zone' | 'place'>): string {
  const zone = ZONE_LABELS[order.zone];
  return order.zone === 'OTHER' && order.place ? `${zone}: ${order.place}` : zone;
}

function itemText(item: FamiliaOrderDTO['items'][number]): string {
  let name = item.productName;
  if (item.optionName) name += ` (${item.optionName})`;
  if (item.addonName) name += ` + ${item.addonName}`;
  if (item.packagingName) name += ` [${item.packagingName}]`;
  const units =
    item.pack > 1
      ? `${item.quantity * item.pack} u (${item.quantity} caja${item.quantity > 1 ? 's' : ''} × ${item.pack})`
      : `× ${item.quantity}`;
  return `• ${name} ${units}`;
}

/**
 * Texto para pasarle al mensajero (por WhatsApp o donde se le avise): estos pedidos no aparecen en su app.
 * NO incluye precios en USD ni datos del pago: el mensajero solo necesita saber qué entregar y dónde.
 */
export function courierMessage(order: FamiliaOrderDTO): string {
  const byBusiness = new Map<string, FamiliaOrderDTO['items']>();
  for (const item of order.items) byBusiness.set(item.businessName, [...(byBusiness.get(item.businessName) ?? []), item]);

  const lines = [
    `🎁 Pedido Familia #${order.orderNumber}`,
    '',
    `📦 Para: ${order.recipientName}`,
    `🗺 Zona: ${zoneText(order)}`,
    `📍 Dirección: ${order.address}`,
    ...(order.notes ? [`📝 Observaciones: ${order.notes}`] : []),
    '',
  ];
  for (const [business, items] of byBusiness) {
    lines.push(`🏪 ${business}`, ...items.map(itemText), '');
  }
  return lines.join('\n').trimEnd();
}
