import { formatDateTime } from '@/lib/formatDate';
import { ORDER_STATUS_LABEL } from '@/lib/labels';
import type { PdfColumn } from '@/lib/pdfExport';
import type { ApiPaginated, OrderDTO, OrderItemDTO } from '@/lib/types';

// PDF de la lista de pedidos con los filtros activos (ver OrdersPage). Usa el generador de reportes
// (lib/pdfExport.ts): una tabla en horizontal, con encabezado, pie y fila de totales.

/** Tope de pedidos por PDF: más que esto no cabe en un documento útil; hay que acotar los filtros. */
export const MAX_EXPORT_ORDERS = 2000;
/** Máximo que acepta el backend por página. */
export const EXPORT_PAGE_SIZE = 100;

export class TooManyOrdersError extends Error {
  readonly total: number;
  constructor(total: number) {
    super(
      `Hay ${total.toLocaleString('es')} pedidos con estos filtros y el PDF admite hasta ${MAX_EXPORT_ORDERS.toLocaleString('es')}. Acota el rango de fechas o agrega un filtro.`,
    );
    this.name = 'TooManyOrdersError';
    this.total = total;
  }
}

const cup = (value: number) => `${(Math.round(value * 100) / 100).toLocaleString('es')} CUP`;

/** "2 x Pizza de queso (Sabor especial + Extra queso)": cantidad, nombre y variante de la línea. */
export function itemText(item: OrderItemDTO): string {
  const variant = [item.optionName, item.addonName ? `+ ${item.addonName}` : null].filter(Boolean).join(' ');
  return `${item.quantity} x ${item.productName}${variant ? ` (${variant})` : ''}`;
}

/** Una línea por negocio y debajo, con sangría, sus productos: así se ve qué se pidió en cada uno. */
export function businessesWithProducts(order: OrderDTO): string {
  if (order.businesses.length === 0) return '—';
  return order.businesses
    .map((business) => [business.businessName, ...business.items.map((item) => `   ${itemText(item)}`)].join('\n'))
    .join('\n');
}

/** Cliente, teléfono, dirección y referencia: lo que el mensajero necesita para entregar, como en el vale. */
export function customerBlock(order: OrderDTO): string {
  return [
    order.customerName,
    `Tel: ${order.customerPhone}`,
    order.customerAddress,
    ...(order.addressReference ? [`Ref: ${order.addressReference}`] : []),
  ].join('\n');
}

// Negocio y productos va en una sola columna para no ensanchar la tabla: lleva el ancho que sobra.
export const ORDERS_PDF_COLUMNS: PdfColumn<OrderDTO>[] = [
  { header: '#', align: 'center', width: 36, render: (o) => String(o.orderNumber) },
  { header: 'Fecha', width: 60, render: (o) => formatDateTime(o.orderDate) },
  { header: 'Cliente y dirección', width: 120, render: customerBlock },
  { header: 'Negocio y productos', render: businessesWithProducts },
  { header: 'Mensajero', width: 62, render: (o) => o.delivererName ?? '—' },
  { header: 'Estado', align: 'center', width: 66, render: (o) => ORDER_STATUS_LABEL[o.status] ?? o.status },
  { header: 'Subtotal', align: 'right', width: 64, render: (o) => cup(o.productsTotal) },
  { header: 'Mensajería', align: 'right', width: 64, render: (o) => cup(o.deliveryFee) },
  { header: 'Servicio', align: 'right', width: 56, render: (o) => cup(o.platformFee) },
  { header: 'Total', align: 'right', width: 68, render: (o) => cup(o.total) },
];

/**
 * Fila de totales: suma de los pedidos que NO están cancelados (un pedido cancelado no se cobra, así
 * que sumarlo inflaría el total). El texto va en la columna "Cliente", que es ancha.
 */
export function ordersPdfTotals(rows: OrderDTO[]): (string | number)[] {
  const counted = rows.filter((o) => o.status !== 'CANCELLED');
  const sum = (pick: (o: OrderDTO) => number) => counted.reduce((acc, o) => acc + pick(o), 0);
  const cancelled = rows.length - counted.length;
  const label =
    cancelled > 0
      ? `Total (${counted.length} pedidos, sin ${cancelled} cancelado${cancelled === 1 ? '' : 's'})`
      : `Total (${counted.length} pedidos)`;
  return [
    '',
    '',
    label,
    '',
    '',
    '',
    cup(sum((o) => o.productsTotal)),
    cup(sum((o) => o.deliveryFee)),
    cup(sum((o) => o.platformFee)),
    cup(sum((o) => o.total)),
  ];
}

/**
 * Pide TODAS las páginas de la lista con los filtros activos, una tras otra. Si hay más de
 * MAX_EXPORT_ORDERS lanza TooManyOrdersError sin bajar nada más (no se recorta en silencio).
 */
export async function fetchAllOrders(
  fetchPage: (page: number) => Promise<ApiPaginated<OrderDTO>>,
): Promise<OrderDTO[]> {
  const first = await fetchPage(1);
  if (first.meta.total > MAX_EXPORT_ORDERS) throw new TooManyOrdersError(first.meta.total);
  const rows = [...first.data];
  for (let page = 2; page <= first.meta.totalPages; page += 1) {
    rows.push(...(await fetchPage(page)).data);
  }
  return rows;
}

const clip = (text: string, max = 32) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** Líneas del encabezado que describen los filtros activos. */
export function ordersPdfSubtitle(filters: {
  rangeLabel: string;
  status?: string | null;
  delivererName?: string | null;
  businessName?: string | null;
  search?: string | null;
}): string[] {
  return [
    filters.rangeLabel,
    ...(filters.status ? [`Estado: ${filters.status}`] : []),
    ...(filters.businessName ? [`Negocio: ${clip(filters.businessName)}`] : []),
    ...(filters.delivererName ? [`Mensajero: ${clip(filters.delivererName)}`] : []),
    ...(filters.search ? [`Cliente: "${clip(filters.search, 24)}"`] : []),
  ];
}
