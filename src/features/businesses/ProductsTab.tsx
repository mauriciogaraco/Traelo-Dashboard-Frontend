import { useEffect, useMemo, useState } from 'react';
import { Plus, RotateCcw, Search, Tag, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';
import { Thumbnail } from '@/components/ui/Thumbnail';
import type { BusinessDTO, PaginationMeta, ProductDTO } from '@/lib/types';
import { CreateProductModal } from './CreateProductModal';
import { EditProductModal } from './EditProductModal';
import { ProductCommissionModal } from './ProductCommissionModal';
import { ProductOffersModal } from './ProductOffersModal';
import {
  useDeactivateProductMutation,
  useListProductsQuery,
  useUpdateProductMutation,
} from './businessesApi';

const PAGE_SIZE = 10;

interface ProductsTabProps {
  // Un dueño de negocio no recibe comisión ni tarifas del backend, por eso son opcionales.
  business: Pick<BusinessDTO, 'id'> &
    Partial<Pick<BusinessDTO, 'commissionType' | 'defaultProductCommissionAmount'>>;
  canManage: boolean;
  // Dueño de negocio: edita su catálogo pero nunca ve comisiones ni ofertas de Tráelo.
  ownerMode?: boolean;
}

export function ProductsTab({ business, canManage, ownerMode = false }: ProductsTabProps) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [offersProduct, setOffersProduct] = useState<ProductDTO | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductDTO | null>(null);
  const [commissionProduct, setCommissionProduct] = useState<ProductDTO | null>(null);
  const [deactivatingProduct, setDeactivatingProduct] = useState<ProductDTO | null>(null);

  // Búsqueda por nombre con retardo: no se consulta al backend en cada tecla.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  const isInactiveFilter = statusFilter === 'inactive';
  const isFixedPerProduct = !ownerMode && business.commissionType === 'FIXED_PER_PRODUCT';

  const { data, isLoading } = useListProductsQuery({
    businessId: business.id,
    active: statusFilter === 'active' ? true : undefined,
    search: search || undefined,
    page: isInactiveFilter ? 1 : page,
    pageSize: isInactiveFilter ? 100 : PAGE_SIZE,
  });

  const { rows, meta } = useMemo((): { rows: ProductDTO[]; meta: PaginationMeta | null } => {
    if (!data) {
      return { rows: [], meta: null };
    }
    if (!isInactiveFilter) {
      return { rows: data.data, meta: data.meta };
    }
    const inactive = data.data.filter((p) => !p.active);
    const start = (page - 1) * PAGE_SIZE;
    return {
      rows: inactive.slice(start, start + PAGE_SIZE),
      meta: {
        page,
        pageSize: PAGE_SIZE,
        total: inactive.length,
        totalPages: Math.max(1, Math.ceil(inactive.length / PAGE_SIZE)),
      },
    };
  }, [data, isInactiveFilter, page]);

  const [reactivateProduct] = useUpdateProductMutation();
  const [deactivateProduct, { isLoading: isDeactivating }] = useDeactivateProductMutation();

  async function handleConfirmDeactivate() {
    if (!deactivatingProduct) return;
    await deactivateProduct({ businessId: business.id, productId: deactivatingProduct.id }).unwrap();
    setDeactivatingProduct(null);
  }

  const columnCount = 3 + (isFixedPerProduct ? 1 : 0) + 1 + (canManage ? 1 : 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar producto por nombre…"
              aria-label="Buscar producto por nombre"
              className="w-64 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
        {canManage && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo producto
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium">Precio ref.</th>
              {isFixedPerProduct && <th className="px-4 py-3 font-medium">Comisión</th>}
              <th className="px-4 py-3 font-medium">Estado</th>
              {canManage && <th className="px-4 py-3 font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={columnCount} className="px-4 py-8 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="px-4 py-8 text-center text-slate-400">
                  {search
                    ? `No hay productos que coincidan con «${search}».`
                    : 'Este negocio todavía no tiene productos cargados.'}
                </td>
              </tr>
            )}
            {rows.map((product) => (
              <tr key={product.id} className="text-slate-700">
                <td className="px-4 py-3 font-medium text-slate-900">
                  <div className="flex items-center gap-3">
                    <Thumbnail src={product.imageUrl} alt={product.name} size={40} />
                    <span>{product.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{product.category ?? '—'}</td>
                <td className="px-4 py-3">{product.price !== null ? `${product.price} CUP` : '—'}</td>
                {isFixedPerProduct && (
                  <td className="px-4 py-3">
                    {product.commission ? (
                      `${product.commission.commissionAmount} CUP`
                    ) : (
                      <span className="text-slate-400">
                        {business.defaultProductCommissionAmount} CUP (por defecto)
                      </span>
                    )}
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setCommissionProduct(product)}
                        className="ml-2 text-xs text-brand-600 hover:underline"
                      >
                        editar
                      </button>
                    )}
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={product.active ? 'green' : 'slate'}>
                      {product.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                    {product.active && !product.available && <Badge tone="red">Sin stock</Badge>}
                    {product.active && product.available && product.lowStock && (
                      <Badge tone="amber">Poco stock</Badge>
                    )}
                  </div>
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setEditingProduct(product)}
                      >
                        Editar
                      </Button>
                      {!ownerMode && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setOffersProduct(product)}
                        >
                          <Tag className="h-4 w-4" />
                          Ofertas
                        </Button>
                      )}
                      {product.active ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setDeactivatingProduct(product)}
                        >
                          <UserX className="h-4 w-4" />
                          Desactivar
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            reactivateProduct({
                              businessId: business.id,
                              productId: product.id,
                              body: { active: true },
                            })
                          }
                        >
                          <RotateCcw className="h-4 w-4" />
                          Activar
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {meta && <Pagination meta={meta} onPageChange={setPage} />}
      </div>

      {createOpen && (
        <CreateProductModal businessId={business.id} onClose={() => setCreateOpen(false)} />
      )}
      {editingProduct && (
        <EditProductModal
          businessId={business.id}
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
        />
      )}
      {offersProduct && (
        <ProductOffersModal
          businessId={business.id}
          product={offersProduct}
          onClose={() => setOffersProduct(null)}
        />
      )}
      {commissionProduct && (
        <ProductCommissionModal
          businessId={business.id}
          product={commissionProduct}
          defaultCommissionAmount={business.defaultProductCommissionAmount ?? null}
          onClose={() => setCommissionProduct(null)}
        />
      )}
      {deactivatingProduct && (
        <ConfirmDialog
          title="Desactivar producto"
          description={`${deactivatingProduct.name} dejará de estar disponible para nuevos pedidos. ¿Confirmás?`}
          confirmLabel="Desactivar"
          isLoading={isDeactivating}
          onConfirm={handleConfirmDeactivate}
          onCancel={() => setDeactivatingProduct(null)}
        />
      )}
    </div>
  );
}
