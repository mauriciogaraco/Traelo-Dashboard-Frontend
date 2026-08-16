import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import type { BusinessDTO } from '@/lib/types';
import type { GroupDraft, ItemDraft } from './orderDraftTypes';

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

/** Editor dinámico de negocios+productos de un pedido, compartido entre crear y editar. */
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
    <div className="flex flex-col gap-4">
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
          <div key={group.key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div className="w-64">
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
                  className="flex items-center gap-1 text-sm text-red-600 hover:underline"
                >
                  <Trash2 className="h-4 w-4" />
                  Quitar negocio
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {group.items.map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  <input
                    value={item.productName}
                    onChange={(e) => updateItem(group.key, item.key, { productName: e.target.value })}
                    placeholder="Producto"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(group.key, item.key, { quantity: e.target.value })}
                    placeholder="Cant."
                    className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(group.key, item.key, { unitPrice: e.target.value })}
                    placeholder="Precio"
                    className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(group.key, item.key)}
                    disabled={group.items.length <= 1}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between">
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

      <Button type="button" variant="secondary" onClick={addGroup} className="self-start">
        <Plus className="h-4 w-4" />
        Agregar negocio
      </Button>
    </div>
  );
}
