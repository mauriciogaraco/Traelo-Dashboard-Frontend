export interface ItemDraft {
  key: string;
  productName: string;
  // Solo si se eligió del catálogo del negocio; texto libre = null (el producto no tiene que existir).
  productId?: string | null;
  quantity: string;
  unitPrice: string;

  // ── Variantes del producto (tipo/sabor, agrego y envase) ────────────────────────────────────
  // Producto del catálogo del que se leen las variantes para mostrarlas. A diferencia de `productId`
  // (lo que se manda al guardar), también se rellena en los ítems ya guardados de un pedido.
  catalogProductId?: string | null;
  optionName?: string | null;
  addonName?: string | null;
  /** Precio POR UNIDAD del agrego, ya en CUP. El unitPrice ya lo trae sumado. */
  addonPrice?: number | null;
  packagingName?: string | null;
  /** Precio y capacidad del envase elegido (para recalcular el costo al cambiar la cantidad). */
  packagingPrice?: number | null;
  packagingCapacity?: number | null;
  /** Costo total del envase de un ítem ya guardado cuando no se pudo leer su definición del catálogo. */
  packagingFee?: number | null;
  /** Unidades por caja (producto con formato): `quantity` cuenta cajas y `unitPrice` es el de la caja. */
  unitsPerPack?: number | null;
}

export interface GroupDraft {
  key: string;
  businessId: string | null;
  items: ItemDraft[];
}

export function makeId(): string {
  return Math.random().toString(36).slice(2);
}

export function emptyItem(): ItemDraft {
  return { key: makeId(), productName: '', quantity: '1', unitPrice: '' };
}

export function emptyGroup(): GroupDraft {
  return { key: makeId(), businessId: null, items: [emptyItem()] };
}

function quantityOf(item: ItemDraft): number {
  return Math.max(1, Math.trunc(Number(item.quantity)) || 1);
}

/**
 * Costo total del envase de una línea: con capacidad, un envase cada N unidades (redondeando hacia
 * arriba); sin capacidad, uno por unidad — igual que computePackagingFee del backend.
 */
export function itemPackagingFee(item: ItemDraft): number {
  if (!item.packagingName) return 0;
  if (item.packagingPrice != null) {
    const capacity = item.packagingCapacity && item.packagingCapacity > 0 ? item.packagingCapacity : null;
    const units = capacity ? Math.ceil(quantityOf(item) / capacity) : quantityOf(item);
    return item.packagingPrice * units;
  }
  return item.packagingFee ?? 0;
}

/** Producto + envase de la línea (lo que suma al subtotal del negocio). */
export function itemLineTotal(item: ItemDraft): number {
  return (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) + itemPackagingFee(item);
}

/** Campos de variantes para mandar al backend (solo los que tienen valor). */
export function itemVariantPayload(item: ItemDraft) {
  return {
    ...(item.optionName ? { optionName: item.optionName } : {}),
    ...(item.addonName ? { addonName: item.addonName, addonPrice: item.addonPrice ?? 0 } : {}),
    ...(item.packagingName
      ? { packagingName: item.packagingName, packagingFee: itemPackagingFee(item) }
      : {}),
    ...(item.unitsPerPack && item.unitsPerPack > 1 ? { unitsPerPack: item.unitsPerPack } : {}),
  };
}

/** Convierte un monto escrito en la moneda del producto a CUP (mismo redondeo que el backend). */
export function toCup(amount: number, currency: 'CUP' | 'USD' | undefined, rate: number | null): number | null {
  if (currency !== 'USD') return amount;
  if (rate == null) return null;
  return Math.round(amount * rate);
}
