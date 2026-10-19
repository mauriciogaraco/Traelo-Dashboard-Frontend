import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import type { BusinessDTO } from '@/lib/types';
import type { GroupDraft, ItemDraft } from './orderDraftTypes';
import { ProductNameInput } from './ProductNameInput';

interface BusinessGroupsEditorProps {
  groups: GroupDraft[];
  businesses: BusinessDTO[];
  updateGroup: (key: string, patch: Partial<GroupDraft>) => void;
  updateItem: (groupKey: string, itemKey: string, patch: Partial<ItemDraft>) => void;
  addGroup: () => void;
  removeGroup: (key: string) => void;
  addItem: (groupKey: string) => void;
  removeItem: (groupKey: string, itemKey: string) => void;
}

// text-base en móvil (16px): por debajo de eso Safari/iOS hace zoom al enfocar un campo.
const NUMBER_INPUT =
  'w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm';

/**
 * Editor dinámico de negocios+productos de un pedido, compartido entre crear y editar. En móvil cada
 * producto es una tarjeta compacta (nombre arriba; cantidad, precio y borrar debajo); desde `sm` vuelve
 * a una sola fila.
 */
export function BusinessGroupsEditor({
  groups,
  businesses,
  updateGroup,
  updateItem,
  addGroup,
  removeGroup,
  addItem,
  removeItem,
}: BusinessGroupsEditorProps) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {groups.map((group) => {
        const usedElsewhere = groups
          .filter((g) => g.key !== group.key)
          .map((g) => g.businessId)
          .filter(Boolean);
        const businessOptions = businesses
          .filter((b) => !usedElsewhere.includes(b.id))
          .map((b) => ({ value: b.id, label: b.name }));
        const groupSubtotal = group.items.reduce(
          (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
          0,
        );

        return (
          <div
            key={group.key}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5"
          >
            <div className="mb-3 flex items-end gap-2">
              <div className="min-w-0 flex-1 sm:max-w-xs">
                <SearchableSelect
                  label="Negocio"
                  value={group.businessId}
                  onChange={(value) => updateGroup(group.key, { businessId: value })}
                  options={businessOptions}
                  placeholder="Elegir negocio…"
                />
              </div>
              {groups.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeGroup(group.key)}
                  aria-label="Quitar negocio"
                  className="flex shrink-0 items-center gap-1 rounded-lg p-2.5 text-sm text-red-600 hover:bg-red-50 sm:px-2 sm:py-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Quitar negocio</span>
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {group.items.map((item) => (
                <div
                  key={item.key}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-center gap-2 rounded-lg bg-slate-50 p-2 sm:flex sm:bg-transparent sm:p-0"
                >
                  <div className="col-span-3 sm:flex sm:flex-1">
                    <ProductNameInput
                      businessId={group.businessId}
                      value={item.productName}
                      // Texto a mano: el producto es libre y deja de estar atado al catálogo.
                      onTextChange={(text) =>
                        updateItem(group.key, item.key, { productName: text, productId: null })
                      }
                      // Del catálogo: se completa el nombre y, si tiene precio, el precio.
                      onPick={(product) =>
                        updateItem(group.key, item.key, {
                          productName: product.name,
                          productId: product.id,
                          ...(product.price != null ? { unitPrice: String(product.price) } : {}),
                        })
                      }
                    />
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(group.key, item.key, { quantity: e.target.value })}
                    placeholder="Cant."
                    aria-label="Cantidad"
                    className={`${NUMBER_INPUT} sm:w-20`}
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(group.key, item.key, { unitPrice: e.target.value })}
                    placeholder="Precio"
                    aria-label="Precio"
                    className={`${NUMBER_INPUT} sm:w-28`}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(group.key, item.key)}
                    disabled={group.items.length <= 1}
                    aria-label="Quitar producto"
                    className="rounded-lg p-2.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 sm:p-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="ghost" onClick={() => addItem(group.key)}>
                <Plus className="h-4 w-4" />
                Agregar producto
              </Button>
              <p className="text-sm text-slate-500">
                Subtotal: <span className="font-medium text-slate-900">{groupSubtotal} CUP</span>
              </p>
            </div>
          </div>
        );
      })}

      <Button
        type="button"
        variant="secondary"
        onClick={addGroup}
        className="w-full sm:w-auto sm:self-start"
      >
        <Plus className="h-4 w-4" />
        Agregar negocio
      </Button>
    </div>
  );
}
