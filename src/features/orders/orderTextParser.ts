import type { BusinessDTO, OrderDTO } from '@/lib/types';

export interface ParsedOrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface ParsedOrderBusinessGroup {
  // null cuando el texto no matcheó con ningún negocio activo por nombre — el usuario debe
  // elegirlo a mano en el formulario. Nunca se adivina un negocio al azar.
  businessId: string | null;
  businessNameGuess: string | null;
  items: ParsedOrderItem[];
}

export interface ParsedOrderDraft {
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  addressReference: string | null;
  deliveryFee: number | null;
  // Lo que decía el vale pegado (puede ser 0 si no se cobró en ese pedido puntual). Se ofrece
  // como sugerencia editable para el campo de anulación del Servicio Tráelo — nunca se envía
  // solo, el staff siempre puede corregirlo antes de guardar.
  platformFeeOverride: number | null;
  businessGroups: ParsedOrderBusinessGroup[];
  unmatchedLines: string[];
}

// Campos que se llenan directo, uno por línea (la última línea etiquetada gana).
const SIMPLE_LABEL_PATTERNS: { key: 'customerName' | 'customerPhone' | 'customerAddress'; regex: RegExp }[] = [
  { key: 'customerName', regex: /^(?:cliente|nombre)\s*:\s*(.+)$/i },
  { key: 'customerPhone', regex: /^(?:tel[eé]fono|tel|cel(?:ular)?|contacto)\s*:\s*(.+)$/i },
  { key: 'customerAddress', regex: /^(?:direcci[oó]n|dir)\s*:\s*(.+)$/i },
];

// Campos que se acumulan (puede haber referencia + nota de entrega, por ejemplo) y se
// combinan en addressReference.
const NOTE_LABEL_PATTERNS: { prefix: string; regex: RegExp }[] = [
  { prefix: '', regex: /^(?:referencia|ref)\s*:\s*(.+)$/i },
  { prefix: 'Entrega: ', regex: /^entrega\s*:?\s*(.+)$/i },
];

const DELIVERY_FEE_REGEX = /^(?:mensajer[ií]a|env[ií]o|delivery|flete)\s*:?\s*\$?\s*([\d.,]+)/i;
const PLATFORM_FEE_REGEX = /^servicio\s+tr[aá]elo\s*:?\s*\$?\s*([\d.,]+)/i;

// Líneas informativas que nunca deben interpretarse como producto ni mostrarse como "sin
// interpretar": el subtotal/total los calcula siempre el backend, y el header no aporta nada.
const IGNORE_LINE_PATTERNS = [/^subtotal\b/i, /^total\b/i, /^pedido\s*#?\s*\d/i];

const PHONE_REGEX = /(?:\+?53[\s-]?)?5\d{2}[\s-]?\d{4,5}\b/;

// La coma es separador de miles en este contexto (1,300 -> 1300), no decimal.
function parseMoney(raw: string): number {
  const cleaned = raw.replace(/[^\d.,]/g, '').replace(/,/g, '');
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : 0;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

// Quita emojis, viñetas (•) y símbolos sueltos al inicio de la línea ("🏪 Los Macus" -> "Los
// Macus"), que son muy comunes en pedidos pegados de WhatsApp y rompían todo el matching.
function stripLeadingDecoration(line: string): string {
  return line.replace(/^[^\p{L}\p{N}]+/u, '').trim();
}

// Redondea a centavos para evitar arrastres de coma flotante al derivar el precio unitario.
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseItemLine(line: string): ParsedOrderItem | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // "2x Pizza familiar - 500" / "2 × Pizza familiar — 500": el monto es el SUBTOTAL de la
  // línea (ya multiplicado por la cantidad), no el precio unitario — así vienen los vales
  // reales que pega el staff. El precio unitario se deriva dividiendo.
  let m = trimmed.match(/^(\d+)\s*[x×]\s*(.+?)\s*[-–—]?\s*\$?\s*(\d[\d.,]*)\s*(?:cup)?$/i);
  if (m?.[1] && m[2] && m[3]) {
    const quantity = Math.max(1, Number(m[1]));
    const lineTotal = parseMoney(m[3]);
    return { quantity, productName: m[2].trim(), unitPrice: roundMoney(lineTotal / quantity) };
  }

  // "Pizza familiar x2 - 500" / "Jamón y Queso Especial × 3 — 900 CUP" (mismo criterio: 500/900
  // es el subtotal de la línea).
  m = trimmed.match(/^(.+?)\s*[x×]\s*(\d+)\s*[-–—]?\s*\$?\s*(\d[\d.,]*)\s*(?:cup)?$/i);
  if (m?.[1] && m[2] && m[3]) {
    const quantity = Math.max(1, Number(m[2]));
    const lineTotal = parseMoney(m[3]);
    return { quantity, productName: m[1].trim(), unitPrice: roundMoney(lineTotal / quantity) };
  }

  // "Pizza familiar - 500" / "Pizza familiar 500" (sin cantidad explícita -> 1)
  m = trimmed.match(/^(.+?)\s*[-–—]?\s*\$?\s*(\d[\d.,]*)\s*(?:cup)?$/i);
  if (m?.[1] && m[2] && m[1].length > 1) {
    return { quantity: 1, productName: m[1].trim(), unitPrice: parseMoney(m[2]) };
  }

  return null;
}

/**
 * Heurística "mejor esfuerzo" para separar un texto pegado (tipo WhatsApp) en los campos del
 * pedido. Nunca es 100% confiable — el resultado siempre queda en un formulario editable para
 * que el usuario revise/corrija antes de guardar.
 */
export function parseOrderText(text: string, businesses: BusinessDTO[]): ParsedOrderDraft {
  const draft: ParsedOrderDraft = {
    customerName: null,
    customerPhone: null,
    customerAddress: null,
    addressReference: null,
    deliveryFee: null,
    platformFeeOverride: null,
    businessGroups: [],
    unmatchedLines: [],
  };

  const notes: string[] = [];
  const businessByNormalizedName = new Map(businesses.map((b) => [normalize(b.name), b]));

  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let currentGroup: ParsedOrderBusinessGroup | null = null;

  for (const rawLine of rawLines) {
    const line = stripLeadingDecoration(rawLine);
    if (!line) continue;

    if (IGNORE_LINE_PATTERNS.some((regex) => regex.test(line))) {
      continue;
    }

    // 1. Campos simples etiquetados ("Cliente: ...", "Dirección: ...", "Teléfono: ...").
    const simpleMatch = SIMPLE_LABEL_PATTERNS.find(({ regex }) => regex.test(line));
    if (simpleMatch) {
      const value = line.match(simpleMatch.regex)?.[1]?.trim();
      if (value) draft[simpleMatch.key] = value;
      continue;
    }

    // 2. Mensajería.
    const feeMatch = line.match(DELIVERY_FEE_REGEX);
    if (feeMatch?.[1]) {
      draft.deliveryFee = parseMoney(feeMatch[1]);
      continue;
    }

    // 2b. Servicio Tráelo: se ofrece como sugerencia editable, nunca se envía tal cual.
    const platformFeeMatch = line.match(PLATFORM_FEE_REGEX);
    if (platformFeeMatch?.[1]) {
      draft.platformFeeOverride = parseMoney(platformFeeMatch[1]);
      continue;
    }

    // 3. Notas que se combinan en addressReference (Referencia, Entrega).
    const noteMatch = NOTE_LABEL_PATTERNS.find(({ regex }) => regex.test(line));
    if (noteMatch) {
      const value = line.match(noteMatch.regex)?.[1]?.trim();
      if (value) notes.push(`${noteMatch.prefix}${value}`);
      continue;
    }

    // 4. ¿La línea es el nombre de un negocio activo? -> abre un grupo nuevo.
    const business = businessByNormalizedName.get(normalize(line));
    if (business) {
      currentGroup = { businessId: business.id, businessNameGuess: business.name, items: [] };
      draft.businessGroups.push(currentGroup);
      continue;
    }

    // 5. Teléfono suelto, sin etiqueta.
    if (!draft.customerPhone && PHONE_REGEX.test(line) && line.replace(/\D/g, '').length <= 12) {
      draft.customerPhone = line.match(PHONE_REGEX)?.[0]?.trim() ?? line;
      continue;
    }

    // 6. Línea de producto ("2x Pizza - 500", "Jamón × 1 — 550 CUP").
    const item = parseItemLine(line);
    if (item) {
      if (!currentGroup) {
        // Sin negocio detectado todavía: si hay un único negocio activo, se asume ese
        // (igual queda editable); si no, va a un grupo sin negocio que el usuario debe elegir.
        currentGroup = {
          businessId: businesses.length === 1 ? (businesses[0]?.id ?? null) : null,
          businessNameGuess: businesses.length === 1 ? (businesses[0]?.name ?? null) : null,
          items: [],
        };
        draft.businessGroups.push(currentGroup);
      }
      currentGroup.items.push(item);
      continue;
    }

    draft.unmatchedLines.push(rawLine);
  }

  if (notes.length > 0) {
    draft.addressReference = notes.join(' · ');
  }

  return draft;
}

/**
 * Genera el texto del vale a partir de un pedido ya guardado, en el mismo formato que
 * `parseOrderText` espera al pegarlo — así el mensajero siempre recibe el vale actualizado
 * (por ejemplo después de editar el pedido) en vez de que el staff lo corrija a mano.
 */
export function generateOrderVoucherText(order: OrderDTO): string {
  const lines: string[] = [
    `Cliente: ${order.customerName}`,
    `Tel: ${order.customerPhone}`,
    `Dirección: ${order.customerAddress}`,
  ];

  if (order.addressReference) {
    lines.push(`Referencia: ${order.addressReference}`);
  }

  for (const business of order.businesses) {
    lines.push('');
    lines.push(business.businessName);
    for (const item of business.items) {
      lines.push(`${item.quantity}x ${item.productName} - ${item.subtotal}`);
    }
  }

  lines.push('');
  lines.push(`Subtotal: ${order.productsTotal}`);
  lines.push(`Mensajería: ${order.deliveryFee}`);
  if (order.platformFee > 0) {
    lines.push(`Servicio Tráelo: ${order.platformFee}`);
  }
  lines.push(`Total: ${order.total}`);

  return lines.join('\n');
}
