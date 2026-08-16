export interface ItemDraft {
  key: string;
  productName: string;
  quantity: string;
  unitPrice: string;
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
