import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoUrl from '@/assets/logo.webp';
import { formatDateTime } from './formatDate';

// Mismos tokens que --color-brand-* / slate-* de index.css, para que el PDF se vea como
// una extensión de la web en vez de un reporte genérico.
const BRAND_600 = '#f0501a';
const BRAND_50 = '#fff4f0';
const SLATE_900 = '#0f172a';
const SLATE_500 = '#64748b';
const SLATE_200 = '#e2e8f0';
const WHITE = '#ffffff';

const PAGE_MARGIN = 32;
const HEADER_HEIGHT = 74;

// El logo es .webp; jsPDF solo reconoce JPEG/PNG por firma de archivo, así que se decodifica
// una vez en un <canvas> oculto y se reexporta como PNG en memoria. Cacheado porque cada
// export de cada tablita reutiliza la misma imagen.
let logoPngPromise: Promise<string> | null = null;

function getLogoPng(): Promise<string> {
  if (!logoPngPromise) {
    logoPngPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo preparar el logo para el PDF.'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('No se pudo cargar el logo para el PDF.'));
      img.src = logoUrl;
    });
  }
  return logoPngPromise;
}

export interface PdfColumn<T> {
  header: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => string;
}

export interface PdfExportOptions<T> {
  /** Título del reporte, ej. "Negocios". */
  title: string;
  /** Línea(s) debajo del título describiendo el filtro activo, ej. "Rango: Este mes". */
  subtitle: string[];
  /** Nombre del archivo, sin extensión. */
  fileName: string;
  columns: PdfColumn<T>[];
  rows: T[];
  /** Fila de totales opcional, mismo largo que columns; celdas vacías se dejan como ''. */
  totals?: (string | number)[];
  emptyMessage?: string;
}

export async function exportReportPdf<T>(options: PdfExportOptions<T>): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoPng = await getLogoPng().catch(() => null);

  function drawHeader() {
    doc.setFillColor(BRAND_600);
    doc.rect(0, 0, pageWidth, HEADER_HEIGHT, 'F');

    let textX = PAGE_MARGIN;
    if (logoPng) {
      const logoSize = 34;
      doc.addImage(logoPng, 'PNG', PAGE_MARGIN, (HEADER_HEIGHT - logoSize) / 2, logoSize, logoSize);
      textX = PAGE_MARGIN + logoSize + 12;
    }

    doc.setTextColor(WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Tráelo Operaciones', textX, HEADER_HEIGHT / 2 - 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(options.title, textX, HEADER_HEIGHT / 2 + 14);

    if (options.subtitle.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(BRAND_50);
      doc.text(options.subtitle.join('   ·   '), pageWidth - PAGE_MARGIN, HEADER_HEIGHT / 2 + 4, {
        align: 'right',
      });
    }
  }

  const head = [options.columns.map((c) => c.header)];
  const body =
    options.rows.length > 0
      ? options.rows.map((row) => options.columns.map((c) => c.render(row)))
      : [[{ content: options.emptyMessage ?? 'Sin datos en este periodo.', colSpan: options.columns.length, styles: { halign: 'center' as const, textColor: SLATE_500 } }]];
  const foot = options.totals ? [options.totals] : undefined;

  autoTable(doc, {
    head,
    body,
    foot,
    startY: HEADER_HEIGHT + 24,
    margin: { top: HEADER_HEIGHT + 24, left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: 40 },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 7,
      textColor: SLATE_900,
      lineColor: SLATE_200,
      lineWidth: 0.75,
    },
    headStyles: {
      fillColor: BRAND_600,
      textColor: WHITE,
      fontStyle: 'bold',
      halign: 'center',
    },
    footStyles: {
      fillColor: SLATE_900,
      textColor: WHITE,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: BRAND_50 },
    columnStyles: Object.fromEntries(
      options.columns.map((c, i) => [i, { halign: c.align ?? 'left' }]),
    ),
    didDrawPage: drawHeader,
  });

  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
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
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - PAGE_MARGIN, pageHeight - 16, {
      align: 'right',
    });
  }

  doc.save(`${options.fileName}.pdf`);
}
