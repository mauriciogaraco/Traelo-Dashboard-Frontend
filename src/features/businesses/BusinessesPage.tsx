import { useEffect, useMemo, useState } from 'react';
import { Plus, RotateCcw, Search, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';
import { COMMISSION_TYPE_LABEL } from '@/lib/labels';
import { CommissionType, type BusinessDTO, type PaginationMeta } from '@/lib/types';
import { CreateBusinessModal } from './CreateBusinessModal';
import { EditBusinessModal } from './EditBusinessModal';
import {
  useDeactivateBusinessMutation,
  useListBusinessesQuery,
  useUpdateBusinessMutation,
} from './businessesApi';

const PAGE_SIZE = 10;

export function BusinessesPage() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const canManage = currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN';

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [commissionTypeFilter, setCommissionTypeFilter] = useState<CommissionType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<BusinessDTO | null>(null);
  const [deactivatingBusiness, setDeactivatingBusiness] = useState<BusinessDTO | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, commissionTypeFilter, statusFilter]);

  const isInactiveFilter = statusFilter === 'inactive';

  const { data, isLoading, isFetching } = useListBusinessesQuery({
    search: search || undefined,
    commissionType: commissionTypeFilter === 'ALL' ? undefined : commissionTypeFilter,
    active: statusFilter === 'active' ? true : undefined,
    page: isInactiveFilter ? 1 : page,
    // Ver la nota en businessesApi.ts: active=false no es confiable en el backend.
    pageSize: isInactiveFilter ? 100 : PAGE_SIZE,
  });

  const { rows, meta } = useMemo((): { rows: BusinessDTO[]; meta: PaginationMeta | null } => {
    if (!data) {
      return { rows: [], meta: null };
    }
    if (!isInactiveFilter) {
      return { rows: data.data, meta: data.meta };
    }
    const inactive = data.data.filter((b) => !b.active);
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

  const [reactivateBusiness] = useUpdateBusinessMutation();
  const [deactivateBusiness, { isLoading: isDeactivating }] = useDeactivateBusinessMutation();

  async function handleConfirmDeactivate() {
    if (!deactivatingBusiness) return;
    await deactivateBusiness(deactivatingBusiness.id).unwrap();
    setDeactivatingBusiness(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Negocios</h1>
        {canManage && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo negocio
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre…"
            className="rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <select
          value={commissionTypeFilter}
          onChange={(e) => setCommissionTypeFilter(e.target.value as CommissionType | 'ALL')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="ALL">Todos los modelos</option>
          {Object.values(CommissionType).map((type) => (
            <option key={type} value={type}>
              {COMMISSION_TYPE_LABEL[type]}
            </option>
          ))}
        </select>
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

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Dirección</th>
              <th className="px-4 py-3 font-medium">Comisión</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              {canManage && <th className="px-4 py-3 font-medium">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="px-4 py-8 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="px-4 py-8 text-center text-slate-400">
                  No hay negocios que coincidan con los filtros.
                </td>
              </tr>
            )}
            {rows.map((business) => (
              <tr key={business.id} className="text-slate-700">
                <td className="px-4 py-3 font-medium">
                  <Link
                    to={`/businesses/${business.id}`}
                    className="text-slate-900 hover:text-brand-700 hover:underline"
                  >
                    {business.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{business.phone}</td>
                <td className="px-4 py-3 max-w-xs truncate" title={business.address}>
                  {business.address}
                </td>
                <td className="px-4 py-3">
                  {business.commissionType === 'PERCENTAGE'
                    ? `${business.commissionPercentage}%`
                    : `${business.defaultProductCommissionAmount} CUP/prod.`}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={business.active ? 'green' : 'slate'}>
                    {business.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setEditingBusiness(business)}
                      >
                        Editar
                      </Button>
                      {business.active ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setDeactivatingBusiness(business)}
                        >
                          <UserX className="h-4 w-4" />
                          Desactivar
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            reactivateBusiness({ id: business.id, body: { active: true } })
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
      {isFetching && !isLoading && <p className="text-xs text-slate-400">Actualizando…</p>}

      {createOpen && <CreateBusinessModal onClose={() => setCreateOpen(false)} />}
      {editingBusiness && (
        <EditBusinessModal business={editingBusiness} onClose={() => setEditingBusiness(null)} />
      )}
      {deactivatingBusiness && (
        <ConfirmDialog
          title="Desactivar negocio"
          description={`${deactivatingBusiness.name} dejará de estar disponible para nuevos pedidos. ¿Confirmás?`}
          confirmLabel="Desactivar"
          isLoading={isDeactivating}
          onConfirm={handleConfirmDeactivate}
          onCancel={() => setDeactivatingBusiness(null)}
        />
      )}
    </div>
  );
}
