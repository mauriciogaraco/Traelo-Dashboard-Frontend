import { useEffect, useMemo, useState } from 'react';
import { Search, Star } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Thumbnail } from '@/components/ui/Thumbnail';
import type { AdminProductDTO } from '@/lib/types';
import { useListBusinessesQuery } from '@/features/businesses/businessesApi';
import { useListCategoriesQuery } from '@/features/categories/categoriesApi';
import { ProductDetailModal } from './ProductDetailModal';
import { useListAllProductsQuery } from './productsApi';

const PAGE_SIZE = 20;

export function ProductsPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<AdminProductDTO | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, businessId, categoryId]);

  const { data, isLoading } = useListAllProductsQuery({
    search: search || undefined,
    businessId: businessId ?? undefined,
    categoryId: categoryId ?? undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const { data: businessesData } = useListBusinessesQuery({ pageSize: 200, active: true });
  const { data: categoriesData } = useListCategoriesQuery({ pageSize: 200, active: true });

  const businessOptions = useMemo(
    () => (businessesData?.data ?? []).map((b) => ({ value: b.id, label: b.name })),
    [businessesData],
  );
  const categoryOptions = useMemo(
    () => (categoriesData?.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    [categoriesData],
  );

  const rows = data?.data ?? [];
  // Al actualizar `selectedProduct` desde la lista viva de RTK Query (no de un state congelado),
  // el modal abierto se refresca solo cuando la estrella cambia el caché.
  const openProduct = selectedProduct ? (rows.find((p) => p.id === selectedProduct.id) ?? selectedProduct) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Productos</h1>
        <p className="text-sm text-slate-500">
          Productos de todos los negocios. Marcá una estrella para destacarlo en el Home de la app.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar producto…"
            className="rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="w-56">
          <SearchableSelect
            label="Negocio"
            value={businessId}
            onChange={setBusinessId}
            options={businessOptions}
            placeholder="Todos los negocios"
          />
        </div>
        <div className="w-56">
          <SearchableSelect
            label="Categoría"
            value={categoryId}
            onChange={setCategoryId}
            options={categoryOptions}
            placeholder="Todas las categorías"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Negocio</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium">Precio</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Destacado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No hay productos para mostrar.
                </td>
              </tr>
            )}
            {rows.map((product) => (
              <tr
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="cursor-pointer text-slate-700 hover:bg-slate-50"
              >
                <td className="px-4 py-3 font-medium text-slate-900">
                  <div className="flex items-center gap-3">
                    <Thumbnail src={product.imageUrl} alt={product.name} size={32} />
                    {product.name}
                  </div>
                </td>
                <td className="px-4 py-3">{product.businessName}</td>
                <td className="px-4 py-3">{product.category ?? '—'}</td>
                <td className="px-4 py-3">{product.price !== null ? `${product.price} CUP` : '—'}</td>
                <td className="px-4 py-3">
                  <Badge tone={product.active ? 'green' : 'slate'}>
                    {product.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {product.featured ? (
                    <Star className="h-4 w-4 text-amber-500" fill="currentColor" />
                  ) : (
                    <Star className="h-4 w-4 text-slate-300" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </div>

      {openProduct && <ProductDetailModal product={openProduct} onClose={() => setSelectedProduct(null)} />}
    </div>
  );
}
