import { useEffect } from 'react';
import { useListProductsQuery } from '@/features/businesses/businessesApi';
import type { ItemDraft } from './orderDraftTypes';
import { itemPackagingFee, toCup } from './orderDraftTypes';

interface ItemVariantsProps {
  businessId: string | null;
  item: ItemDraft;
  /** CUP por 1 USD (solo lo pueden leer OWNER/ADMIN); null = no disponible. */
  rate: number | null;
  onChange: (patch: Partial<ItemDraft>) => void;
}

const SELECT =
  'w-full min-w-0 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm';

/**
 * Tipo/sabor, agrego y envase del producto elegido del catálogo — lo que la app pide al cliente y que un
 * pedido a mano también necesita. Solo aparece lo que el producto realmente tiene (nada, en la mayoría);
 * en móvil los selectores se apilan y desde `sm` van en una fila. Un ítem de un pedido ya guardado cuyo
 * producto no se puede leer (inactivo, fuera de las primeras 100) muestra sus valores como texto y conserva
 * el costo del envase tal cual.
 */
export function ItemVariants({ businessId, item, rate, onChange }: ItemVariantsProps) {
  const { data } = useListProductsQuery(
    { businessId: businessId ?? '', pageSize: 100, active: true },
    { skip: !businessId || !item.catalogProductId },
  );
  const product = item.catalogProductId
    ? (data?.data ?? []).find((p) => p.id === item.catalogProductId)
    : undefined;

  // Ítem ya guardado: completa precio/capacidad del envase y precio del agrego desde el catálogo, sin
  // tocar lo que ya tiene (para poder recalcular el envase si cambia la cantidad).
  useEffect(() => {
    if (!product) return;
    const patch: Partial<ItemDraft> = {};
    if (item.packagingName && item.packagingPrice == null) {
      const found = (product.packaging ?? []).find((o) => o.name === item.packagingName);
      if (found) {
        patch.packagingPrice = found.price;
        patch.packagingCapacity = found.capacity ?? null;
      }
    }
    if (item.addonName && item.addonPrice == null) {
      const found = (product.addons ?? []).find((a) => a.name === item.addonName);
      const cup = found ? toCup(found.price, product.priceCurrency, rate) : null;
      if (cup !== null) patch.addonPrice = cup;
    }
    if (Object.keys(patch).length > 0) onChange(patch);
  }, [product, item.packagingName, item.packagingPrice, item.addonName, item.addonPrice, rate, onChange]);

  const hasStored = !!(item.optionName || item.addonName || item.packagingName);
  if (!product) {
    if (!hasStored) return null;
    return (
      <p className="text-xs text-slate-500">
        {[
          item.optionName && `Tipo: ${item.optionName}`,
          item.addonName && `Agrego: ${item.addonName}`,
          item.packagingName && `Envase: ${item.packagingName}`,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
    );
  }

  const options = product.options ?? [];
  const addons = product.addons ?? [];
  const packaging = product.packaging ?? [];
  if (options.length === 0 && addons.length === 0 && packaging.length === 0) return null;

  const unitsPerPack = item.unitsPerPack && item.unitsPerPack > 1 ? item.unitsPerPack : 1;
  const addonLine = (cupPerUnit: number) => cupPerUnit * unitsPerPack;

  function handleAddon(name: string) {
    const oldLine = item.addonName ? addonLine(item.addonPrice ?? 0) : 0;
    const chosen = addons.find((a) => a.name === name);
    const cupPerUnit = chosen ? toCup(chosen.price, product!.priceCurrency, rate) : 0;
    if (chosen && cupPerUnit === null) return; // agrego en USD sin tasa para convertirlo
    const newPerUnit = cupPerUnit ?? 0;
    const base = (Number(item.unitPrice) || 0) - oldLine;
    onChange({
      addonName: chosen ? chosen.name : null,
      addonPrice: chosen ? newPerUnit : null,
      unitPrice: String(Math.max(0, base) + (chosen ? addonLine(newPerUnit) : 0)),
    });
  }

  function handlePackaging(name: string) {
    const chosen = packaging.find((o) => o.name === name);
    onChange({
      packagingName: chosen ? chosen.name : null,
      packagingPrice: chosen ? chosen.price : null,
      packagingCapacity: chosen ? (chosen.capacity ?? null) : null,
      packagingFee: null,
    });
  }

  const fee = itemPackagingFee(item);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {options.length > 0 && (
          <select
            aria-label="Tipo o sabor"
            value={item.optionName ?? ''}
            onChange={(e) => onChange({ optionName: e.target.value || null })}
            className={SELECT}
          >
            <option value="">Tipo / sabor</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        )}
        {addons.length > 0 && (
          <select
            aria-label="Agrego"
            value={item.addonName ?? ''}
            onChange={(e) => handleAddon(e.target.value)}
            className={SELECT}
          >
            <option value="">Sin agrego</option>
            {addons.map((a) => {
              const cup = toCup(a.price, product.priceCurrency, rate);
              return (
                <option key={a.name} value={a.name} disabled={cup === null}>
                  {a.name}
                  {cup !== null ? ` (+${cup})` : ' (sin tasa de cambio)'}
                </option>
              );
            })}
          </select>
        )}
        {packaging.length > 0 && (
          <select
            aria-label="Envase"
            value={item.packagingName ?? ''}
            onChange={(e) => handlePackaging(e.target.value)}
            className={SELECT}
          >
            <option value="">Sin envase</option>
            {packaging.map((o) => (
              <option key={o.name} value={o.name}>
                {o.name} (+{o.price}
                {o.capacity ? ` c/${o.capacity} u.` : ''})
              </option>
            ))}
          </select>
        )}
      </div>
      {item.packagingName && (
        <p className="text-xs text-slate-500">
          Envase: <span className="font-medium text-slate-700">{fee} CUP</span> (se suma al subtotal, aparte del
          precio del producto)
        </p>
      )}
    </div>
  );
}
