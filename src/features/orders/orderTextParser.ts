import type { BusinessDTO } from '@/lib/types';

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
  businessGroups: ParsedOrderBusinessGroup[];
  unmatchedLines: string[];
}

const LABEL_PATTERNS: { key: keyof ParsedOrderDraft; regex: RegExp }[] = [
  { key: 'customerName', regex: /^(?:cliente|nombre)\s*:\s*(.+)$/i },
  { key: 'customerPhone', regex: /^(?:tel[eé]fono|tel|cel(?:ular)?|contacto)\s*:\s*(.+)$/i },
  { key: 'customerAddress', regex: /^(?:direcci[oó]n|dir)\s*:\s*(.+)$/i },
  { key: 'addressReference', regex: /^(?:referencia|ref)\s*:\s*(.+)$/i },
  { key: 'deliveryFee', regex: /^(?:mensajer[ií]a|env[ií]o|delivery|flete)\s*:?\s*\$?\s*([\d.,]+)/i },
];

const PHONE_REGEX = /(?:\+?53[\s-]?)?5\d{2}[\s-]?\d{4,5}\b/;

function parseMoney(raw: string): number {
  const cleaned = raw.replace(/[^\d.,]/g, '').replace(/,/g, '.');
  const parts = cleaned.split('.');
  const normalized = parts.length > 1 ? `${parts.slice(0, -1).join('')}.${parts.at(-1)}` : cleaned;
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function parseItemLine(line: string): ParsedOrderItem | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // "2x Pizza familiar - 500" / "2 x Pizza familiar 500"
  let m = trimmed.match(/^(\d+)\s*[xX]\s*(.+?)\s*[-–]?\s*\$?\s*(\d[\d.,]*)\s*(?:cup)?$/i);
  if (m?.[1] && m[2] && m[3]) {
    return { quantity: Number(m[1]), productName: m[2].trim(), unitPrice: parseMoney(m[3]) };
  }

  // "Pizza familiar x2 - 500"
  m = trimmed.match(/^(.+?)\s*[xX]\s*(\d+)\s*[-–]?\s*\$?\s*(\d[\d.,]*)\s*(?:cup)?$/i);
  if (m?.[1] && m[2] && m[3]) {
    return { quantity: Number(m[2]), productName: m[1].trim(), unitPrice: parseMoney(m[3]) };
  }

  // "Pizza familiar - 500" / "Pizza familiar 500" (sin cantidad explícita -> 1)
  m = trimmed.match(/^(.+?)\s*[-–]?\s*\$?\s*(\d[\d.,]*)\s*(?:cup)?$/i);
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
    businessGroups: [],
    unmatchedLines: [],
  };

  const businessByNormalizedName = new Map(businesses.map((b) => [normalize(b.name), b]));

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let currentGroup: ParsedOrderBusinessGroup | null = null;

  for (const line of lines) {
    // 1. Campos etiquetados ("Cliente: ...", "Dirección: ...", etc.)
    let matchedLabel = false;
    for (const { key, regex } of LABEL_PATTERNS) {
      const match = line.match(regex);
      if (match?.[1]) {
        if (key === 'deliveryFee') {
          draft.deliveryFee = parseMoney(match[1]);
        } else {
          (draft as unknown as Record<string, string | null>)[key] = match[1].trim();
        }
        matchedLabel = true;
        break;
      }
    }
    if (matchedLabel) continue;

    // 2. ¿La línea es el nombre de un negocio activo? -> abre un grupo nuevo.
    const business = businessByNormalizedName.get(normalize(line));
    if (business) {
      currentGroup = { businessId: business.id, businessNameGuess: business.name, items: [] };
      draft.businessGroups.push(currentGroup);
      continue;
    }

    // 3. Teléfono suelto, sin etiqueta.
    if (!draft.customerPhone && PHONE_REGEX.test(line) && line.replace(/\D/g, '').length <= 12) {
      draft.customerPhone = line.match(PHONE_REGEX)?.[0]?.trim() ?? line.trim();
      continue;
    }

    // 4. Línea de producto ("2x Pizza - 500").
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

    draft.unmatchedLines.push(line);
  }

  return draft;
}
