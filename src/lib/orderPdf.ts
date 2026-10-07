import { jsPDF } from 'jspdf';
import autoTable, { type CellDef, type RowInput } from 'jspdf-autotable';
import { formatDateTime } from './formatDate';
import { ORDER_STATUS_LABEL } from './labels';
import type { OrderDTO, OrderItemChangeDTO, OrderItemDTO } from './types';
import {
  BRAND_50,
  BRAND_600,
  HEADER_HEIGHT,
  LOGO_ALIAS,
  PAGE_MARGIN,
  SLATE_200,
  SLATE_500,
  SLATE_900,
  WHITE,
  getLogoPng,
} from './pdfExport';

// PDF de UN pedido con todos sus detalles (para el staff: incluye el reparto de la mensajería y las
// comisiones, que no deben salir del equipo). Mismo estilo que los reportes (pdfExport.ts), en vertical.

const SOURCE_LABEL: Record<string, string> = {
  APP: 'App',
  WEB: 'Web',
  MANUAL: 'Manual (dashboard)',
  TELEGRAM: 'Telegram',
};

function money(value: number | null | undefined): string {
  const n = Math.round((value ?? 0) * 100) / 100;
  return `${n.toLocaleString('es')} CUP`;
}

function describeChange(change: OrderItemChangeDTO): string {
  switch (change.kind) {
    case 'added':
      return `Se agregó ${change.productName} (x${change.quantity})`;
    case 'removed':
      return `Se quitó ${change.productName} (x${change.quantity})`;
    case 'quantity':
      // La fuente estándar del PDF no tiene flechas: se escribe con "a".
      return `${change.productName}: cantidad de x${change.from} a x${change.to}`;
    case 'price':
      return `${change.productName}: precio de ${money(change.from)} a ${money(change.to)}`;
  }
}

/** Texto de la línea: producto + variante, agrego, empaque y caja, como se ve en el vale. */
function itemLabel(item: OrderItemDTO): string {
  const extras: string[] = [];
  if (item.optionName) extras.push(item.optionName);
  if (item.addonName) extras.push(`+ ${item.addonName}`);
  if (item.packagingName) extras.push(`empaque: ${item.packagingName}`);
  if ((item.unitsPerPack ?? 1) > 1) extras.push(`caja de ${item.unitsPerPack}`);
  if ((item.pointsUnits ?? 0) > 0) extras.push(`${item.pointsUnits} ud. pagada(s) con puntos`);
  return extras.length > 0 ? `${item.productName}\n${extras.join(' · ')}` : item.productName;
}

type Pair = [string, string];

/**
 * Arma el PDF del pedido y lo devuelve sin descargarlo (exportOrderPdf lo guarda). Separado para
 * poder revisar el documento sin disparar una descarga.
 */
export async function buildOrderPdf(order: OrderDTO): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  const logoPng = await getLogoPng().catch(() => null);

  function drawHeader() {
    doc.setFillColor(BRAND_600);
    doc.rect(0, 0, pageWidth, HEADER_HEIGHT, 'F');
    let textX = PAGE_MARGIN;
    if (logoPng) {
      const logoSize = 34;
      doc.addImage(logoPng, 'PNG', PAGE_MARGIN, (HEADER_HEIGHT - logoSize) / 2, logoSize, logoSize, LOGO_ALIAS);
      textX = PAGE_MARGIN + logoSize + 12;
    }
    doc.setTextColor(WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Tráelo Operaciones', textX, HEADER_HEIGHT / 2 - 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Pedido #${order.orderNumber}`, textX, HEADER_HEIGHT / 2 + 14);
    doc.setFontSize(9);
    doc.setTextColor(BRAND_50);
    doc.text(ORDER_STATUS_LABEL[order.status] ?? order.status, pageWidth - PAGE_MARGIN, HEADER_HEIGHT / 2 + 4, {
      align: 'right',
    });
  }

  let cursorY = HEADER_HEIGHT + 22;

  function section(title: string) {
    // Sin espacio para el título y algo de contenido: página nueva (autoTable ya repinta el encabezado).
    if (cursorY > pageHeight - 120) {
      doc.addPage();
      cursorY = HEADER_HEIGHT + 22;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(SLATE_900);
    doc.text(title, PAGE_MARGIN, cursorY);
    cursorY += 8;
  }

  function after(): void {
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    cursorY = (finalY ?? cursorY) + 20;
  }

  function pairsTable(title: string, pairs: Pair[]) {
    if (pairs.length === 0) return;
    section(title);
    autoTable(doc, {
      body: pairs,
      startY: cursorY,
      margin: { top: HEADER_HEIGHT + 22, left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: 40 },
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 9.5, cellPadding: { top: 4, bottom: 4, left: 6, right: 6 }, textColor: SLATE_900 },
      columnStyles: {
        0: { cellWidth: 140, textColor: SLATE_500 },
        1: { fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          data.cell.styles.lineColor = SLATE_200;
          data.cell.styles.lineWidth = { top: 0, right: 0, left: 0, bottom: 0.5 };
        }
      },
      didDrawPage: drawHeader,
    });
    after();
  }

  // ── Pedido ────────────────────────────────────────────────────────────
  const orderPairs: Pair[] = [
    ['Estado', ORDER_STATUS_LABEL[order.status] ?? order.status],
    ['Origen', SOURCE_LABEL[order.source ?? ''] ?? order.source ?? '—'],
    ['Fecha del pedido', formatDateTime(order.orderDate)],
  ];
  if (order.scheduledFor) orderPairs.push(['Entrega elegida', order.scheduledFor]);
  if (order.assignedAt) orderPairs.push(['Asignado', formatDateTime(order.assignedAt)]);
  if (order.completedAt) orderPairs.push(['Completado', formatDateTime(order.completedAt)]);
  if (order.cancelledAt) orderPairs.push(['Cancelado', formatDateTime(order.cancelledAt)]);
  orderPairs.push(['Mensajero', order.delivererName ?? 'Sin asignar']);
  if (order.registeredByName) orderPairs.push(['Registrado por', order.registeredByName]);
  if (order.raffleNumber != null) orderPairs.push(['Número del sorteo', `#${order.raffleNumber}`]);

  // El motivo va destacado justo después, no entre los datos.
  pairsTable('Pedido', orderPairs);

  if (order.status === 'CANCELLED' && order.cancellationReason) {
    section('Motivo de la cancelación');
    autoTable(doc, {
      body: [[order.cancellationReason]],
      startY: cursorY,
      margin: { top: HEADER_HEIGHT + 22, left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: 40 },
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 8, textColor: '#991b1b', fillColor: '#fef2f2' },
      didDrawPage: drawHeader,
    });
    after();
  }

  // ── Cliente ───────────────────────────────────────────────────────────
  const clientPairs: Pair[] = [
    ['Nombre', order.customerName],
    ['Teléfono', order.customerPhone],
    ['Dirección', order.customerAddress],
  ];
  if (order.addressReference) clientPairs.push(['Referencia', order.addressReference]);
  pairsTable('Cliente', clientPairs);

  // ── Productos, por negocio ────────────────────────────────────────────
  section('Productos');
  const productRows: RowInput[] = [];
  for (const business of order.businesses) {
    const header: CellDef[] = [
      {
        content: business.businessAddress ? `${business.businessName} — ${business.businessAddress}` : business.businessName,
        colSpan: 3,
        styles: { fontStyle: 'bold', fillColor: BRAND_50, textColor: SLATE_900 },
      },
      { content: money(business.subtotal), styles: { fontStyle: 'bold', fillColor: BRAND_50, halign: 'right' } },
    ];
    productRows.push(header);
    for (const item of business.items) {
      productRows.push([itemLabel(item), String(item.quantity), money(item.unitPrice), money(item.subtotal)]);
    }
  }
  autoTable(doc, {
    head: [['Producto', 'Cant.', 'Precio', 'Subtotal']],
    body: productRows.length > 0 ? productRows : [[{ content: 'Sin productos.', colSpan: 4, styles: { halign: 'center' as const } }]],
    startY: cursorY,
    margin: { top: HEADER_HEIGHT + 22, left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: 40 },
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 6, textColor: SLATE_900, lineColor: SLATE_200, lineWidth: 0.75 },
    headStyles: { fillColor: BRAND_600, textColor: WHITE, fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: contentWidth - 60 - 85 - 90 },
      1: { halign: 'center', cellWidth: 60 },
      2: { halign: 'right', cellWidth: 85 },
      3: { halign: 'right', cellWidth: 90 },
    },
    didDrawPage: drawHeader,
  });
  after();

  // ── Resumen y reparto del dinero ──────────────────────────────────────
  const money1: Pair[] = [['Productos (subtotal)', money(order.productsTotal)]];
  if ((order.packagingTotal ?? 0) > 0) money1.push(['   de los cuales, empaque', money(order.packagingTotal)]);
  money1.push(['Mensajería', money(order.deliveryFee)], ['Servicio Tráelo', money(order.platformFee)]);
  if ((order.pointsRedeemed ?? 0) > 0) {
    money1.push(
      ['Total antes del canje', money(order.totalBeforeRedemption ?? order.total)],
      [`Puntos canjeados (${order.pointsRedeemed})`, `- ${money(order.pointsDiscount)}`],
    );
  }
  money1.push(['Total que paga el cliente', money(order.total)]);
  pairsTable('Resumen', money1);

  const split: Pair[] = [
    ['Mensajería — parte del mensajero', money(order.delivererEarning)],
    ['Mensajería — parte de Tráelo', money(order.traeloDeliveryShare)],
    ['Ganancia total de Tráelo', money(order.traeloEarning)],
  ];
  for (const business of order.businesses) {
    const rate =
      business.commissionRateSnapshot != null && business.commissionTypeSnapshot === 'PERCENTAGE'
        ? ` (${business.commissionRateSnapshot}%)`
        : '';
    split.push([`Comisión — ${business.businessName}${rate}`, money(business.commissionEarned)]);
  }
  pairsTable('Reparto (interno)', split);

  // ── Última edición ────────────────────────────────────────────────────
  if (order.lastEditedAt && order.lastEditSummary && order.lastEditSummary.length > 0) {
    section(`Última edición del vale — ${formatDateTime(order.lastEditedAt)}`);
    autoTable(doc, {
      body: order.lastEditSummary.map((change) => [describeChange(change)]),
      startY: cursorY,
      margin: { top: HEADER_HEIGHT + 22, left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: 40 },
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 9.5, cellPadding: { top: 3, bottom: 3, left: 6, right: 6 }, textColor: SLATE_900 },
      didDrawPage: drawHeader,
    });
    after();
  }

  // Pie de cada página.
  const pageCount = doc.getNumberOfPages();
  const generatedAt = `Generado el ${formatDateTime(new Date().toISOString())}`;
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(SLATE_200);
    doc.setLineWidth(0.75);
    doc.line(PAGE_MARGIN, pageHeight - 28, pageWidth - PAGE_MARGIN, pageHeight - 28);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(SLATE_500);
    doc.text(generatedAt, PAGE_MARGIN, pageHeight - 16);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - PAGE_MARGIN, pageHeight - 16, { align: 'right' });
  }
  return doc;
}

export async function exportOrderPdf(order: OrderDTO): Promise<void> {
  const doc = await buildOrderPdf(order);
  doc.save(`pedido-${order.orderNumber}.pdf`);
}
