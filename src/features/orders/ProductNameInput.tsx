import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useListProductsQuery } from '@/features/businesses/businessesApi';
import type { ProductDTO } from '@/lib/types';

interface ProductNameInputProps {
  businessId: string | null;
  value: string;
  /** Texto tecleado a mano: el producto es libre, no hace falta que exista en el catálogo. */
  onTextChange: (text: string) => void;
  /** Se eligió una sugerencia del catálogo del negocio. */
  onPick: (product: ProductDTO) => void;
}

// "Café" y "cafe" deben coincidir: sin tildes, en minúsculas.
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Campo de producto de un vale: a medida que se escribe sugiere los productos activos del negocio
 * elegido, pero NO es rígido — se puede dejar cualquier texto aunque no esté en el catálogo.
 */
export function ProductNameInput({ businessId, value, onTextChange, onPick }: ProductNameInputProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  // Enter solo elige una sugerencia si se navegó la lista con las flechas: si no, el texto queda tal cual.
  const navigatedRef = useRef(false);

  const { data } = useListProductsQuery(
    { businessId: businessId ?? '', pageSize: 100, active: true },
    { skip: !businessId },
  );

  const suggestions = useMemo(() => {
    const products = data?.data ?? [];
    const query = normalize(value);
    const matches = query
      ? products.filter((p) => normalize(p.name).includes(query))
      : products;
    // Ya escrito exacto = nada que sugerir.
    if (matches.length === 1 && normalize(matches[0]!.name) === query) return [];
    return matches.slice(0, 8);
  }, [data, value]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function pick(product: ProductDTO) {
    onPick(product);
    setOpen(false);
    navigatedRef.current = false;
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter') {
      // Enter elige la sugerencia resaltada; para dejar el texto tal cual basta con no navegar la lista.
      if (navigatedRef.current && suggestions[highlight]) {
        event.preventDefault();
        pick(suggestions[highlight]!);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      navigatedRef.current = true;
    }
  }

  return (
    <div className="relative flex-1" ref={containerRef}>
      <input
        value={value}
        onChange={(e) => {
          onTextChange(e.target.value);
          setHighlight(0);
          setOpen(true);
          navigatedRef.current = false;
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={businessId ? 'Producto (escribe para buscar en el negocio)' : 'Producto'}
        autoComplete="off"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
      />
      {open && businessId && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {suggestions.map((product, index) => (
            <li key={product.id}>
              <button
                type="button"
                // mousedown (no click): se elige antes de que el input pierda el foco.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(product);
                }}
                onMouseEnter={() => setHighlight(index)}
                className={clsx(
                  'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm',
                  index === highlight ? 'bg-slate-100' : 'hover:bg-slate-50',
                )}
              >
                <span className="text-slate-900">{product.name}</span>
                {product.price != null && (
                  <span className="shrink-0 text-xs text-slate-500">{product.price} CUP</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
