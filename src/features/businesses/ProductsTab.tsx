import { useEffect, useMemo, useState } from 'react';
import { Plus, RotateCcw, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';
import type { BusinessDTO, PaginationMeta, ProductDTO } from '@/lib/types';
import { CreateProductModal } from './CreateProductModal';
import { EditProductModal } from './EditProductModal';
import { ProductCommissionModal } from './ProductCommissionModal';
import {
  useDeactivateProductMutation,
  useListProductsQuery,
  useUpdateProductMutation,
} from './businessesApi';

const PAGE_SIZE = 10;

interface ProductsTabProps {
  business: BusinessDTO;
  canManage: boolean;
}

export function ProductsTab({ business, canManage }: ProductsTabProps) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDTO | null>(null);
  const [commissionProduct, setCommissionProduct] = useState<ProductDTO | null>(null);
  const [deactivatingProduct, setDeactivatingProduct] = useState<ProductDTO | null>(null);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const isInactiveFilter = statusFilter === 'inactive';
  const isFixedPerProduct = business.commissionType === 'FIXED_PER_PRODUCT';

  const { data, isLoading } = useListProductsQuery({
    businessId: business.id,
    active: statusFilter === 'active' ? true : undefined,
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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
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
                  Este negocio todavía no tiene productos cargados.
                </td>
              </tr>
            )}
            {rows.map((product) => (
              <tr key={product.id} className="text-slate-700">
                <td className="px-4 py-3 font-medium text-slate-900">{product.name}</td>
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
                  <Badge tone={product.active ? 'green' : 'slate'}>
                    {product.active ? 'Activo' : 'Inactivo'}
                  </Badge>
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
      {commissionProduct && (
        <ProductCommissionModal
          businessId={business.id}
          product={commissionProduct}
          defaultCommissionAmount={business.defaultProductCommissionAmount}
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
