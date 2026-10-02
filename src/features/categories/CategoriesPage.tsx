import { useEffect, useState } from 'react';
import { Plus, RotateCcw, Search, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { useToast } from '@/components/ui/ToastProvider';
import type { CategoryDTO } from '@/lib/types';
import { CategoryFormModal } from './CategoryFormModal';
import {
  useDeactivateCategoryMutation,
  useListCategoriesQuery,
  useUpdateCategoryMutation,
} from './categoriesApi';

const PAGE_SIZE = 10;

export function CategoriesPage() {
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDTO | null>(null);
  const [deactivatingCategory, setDeactivatingCategory] = useState<CategoryDTO | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const { data, isLoading } = useListCategoriesQuery({
    search: search || undefined,
    active: statusFilter === 'all' ? undefined : statusFilter === 'active',
    page,
    pageSize: PAGE_SIZE,
  });
  const [updateCategory] = useUpdateCategoryMutation();
  const [deactivateCategory, { isLoading: isDeactivating }] = useDeactivateCategoryMutation();

  async function handleConfirmDeactivate() {
    if (!deactivatingCategory) return;
    try {
      await deactivateCategory(deactivatingCategory.id).unwrap();
      setDeactivatingCategory(null);
    } catch {
      showToast('No se pudo desactivar la categoría', 'error');
    }
  }

  async function handleReactivate(category: CategoryDTO) {
    const res = await updateCategory({ id: category.id, body: { active: true } });
    if ('error' in res) {
      showToast('No se pudo activar la categoría', 'error');
    }
  }

  const rows = data?.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Categorías</h1>
        <p className="text-sm text-slate-500">
          Categorías globales que se asignan a los productos de todos los negocios.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar categoría…"
              className="rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
          </select>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Nueva categoría
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Ícono</th>
              <th className="px-4 py-3 font-medium">Orden</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
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
                  No hay categorías para mostrar.
                </td>
              </tr>
            )}
            {rows.map((category) => (
              <tr key={category.id} className="text-slate-700">
                <td className="px-4 py-3 font-medium text-slate-900">
                  <div className="flex items-center gap-3">
                    <Thumbnail src={category.imageUrl} alt={category.name} size={32} shape="circle" />
                    {category.name}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{category.slug}</td>
                <td className="px-4 py-3">{category.icon ?? '—'}</td>
                <td className="px-4 py-3">{category.sortOrder}</td>
                <td className="px-4 py-3">
                  <Badge tone={category.active ? 'green' : 'slate'}>
                    {category.active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEditingCategory(category)}
                    >
                      Editar
                    </Button>
                    {category.active ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setDeactivatingCategory(category)}
                      >
                        <UserX className="h-4 w-4" />
                        Desactivar
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleReactivate(category)}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Activar
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </div>

      {createOpen && <CategoryFormModal onClose={() => setCreateOpen(false)} />}
      {editingCategory && (
        <CategoryFormModal category={editingCategory} onClose={() => setEditingCategory(null)} />
      )}
      {deactivatingCategory && (
        <ConfirmDialog
          title="Desactivar categoría"
          description={`${deactivatingCategory.name} dejará de aparecer al asignar categorías a productos. Los productos que ya la tienen no cambian. ¿Confirmás?`}
          confirmLabel="Desactivar"
          isLoading={isDeactivating}
          onConfirm={handleConfirmDeactivate}
          onCancel={() => setDeactivatingCategory(null)}
        />
      )}
    </div>
  );
}
