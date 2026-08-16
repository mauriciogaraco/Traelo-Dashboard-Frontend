import { useEffect, useMemo, useState } from 'react';
import { Plus, RotateCcw, UserX } from 'lucide-react';
import { useAppSelector } from '@/app/hooks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';
import { ROLE_LABEL } from '@/lib/labels';
import { Role, type PaginationMeta, type UserDTO } from '@/lib/types';
import { CreateUserModal } from './CreateUserModal';
import { EditUserModal } from './EditUserModal';
import { useDeactivateUserMutation, useListUsersQuery, useUpdateUserMutation } from './usersApi';

const PAGE_SIZE = 10;
const ALL_ROLES = Object.values(Role);

export function UsersPage() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDTO | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<UserDTO | null>(null);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, statusFilter]);

  const isInactiveFilter = statusFilter === 'inactive';

  const { data, isLoading, isFetching } = useListUsersQuery({
    role: roleFilter === 'ALL' ? undefined : roleFilter,
    active: statusFilter === 'active' ? true : undefined,
    page: isInactiveFilter ? 1 : page,
    // El backend no permite filtrar active=false de forma confiable (ver usersApi.ts),
    // así que para "Inactivos" traemos un lote grande y filtramos/paginamos en el cliente.
    pageSize: isInactiveFilter ? 100 : PAGE_SIZE,
  });

  const { rows, meta } = useMemo((): { rows: UserDTO[]; meta: PaginationMeta | null } => {
    if (!data) {
      return { rows: [], meta: null };
    }
    if (!isInactiveFilter) {
      return { rows: data.data, meta: data.meta };
    }
    const inactive = data.data.filter((user) => !user.active);
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

  const [reactivateUser] = useUpdateUserMutation();
  const [deactivateUser, { isLoading: isDeactivating }] = useDeactivateUserMutation();

  const allowedCreateRoles = useMemo(
    () => (currentUser?.role === 'ADMIN' ? ALL_ROLES.filter((r) => r !== 'OWNER') : ALL_ROLES),
    [currentUser?.role],
  );

  function canManage(user: UserDTO): boolean {
    if (user.role === 'OWNER' && currentUser?.role !== 'OWNER') {
      return false;
    }
    return true;
  }

  async function handleConfirmDeactivate() {
    if (!deactivatingUser) return;
    await deactivateUser(deactivatingUser.id).unwrap();
    setDeactivatingUser(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Usuarios</h1>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Role | 'ALL')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="ALL">Todos los roles</option>
          {ALL_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABEL[role]}
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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Correo</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
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
                  No hay usuarios que coincidan con los filtros.
                </td>
              </tr>
            )}
            {rows.map((user) => (
              <tr key={user.id} className="text-slate-700">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {user.name}
                  {user.id === currentUser?.id && (
                    <span className="ml-2 text-xs text-slate-400">(tú)</span>
                  )}
                </td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">
                  <Badge tone="brand">{ROLE_LABEL[user.role]}</Badge>
                </td>
                <td className="px-4 py-3">{user.phone ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge tone={user.active ? 'green' : 'slate'}>
                    {user.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {canManage(user) ? (
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="ghost" onClick={() => setEditingUser(user)}>
                        Editar
                      </Button>
                      {user.active ? (
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={user.id === currentUser?.id}
                          title={
                            user.id === currentUser?.id
                              ? 'No podés desactivar tu propia cuenta'
                              : undefined
                          }
                          onClick={() => setDeactivatingUser(user)}
                        >
                          <UserX className="h-4 w-4" />
                          Desactivar
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            reactivateUser({ id: user.id, body: { active: true } })
                          }
                        >
                          <RotateCcw className="h-4 w-4" />
                          Activar
                        </Button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Sin permisos</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {meta && <Pagination meta={meta} onPageChange={setPage} />}
      </div>
      {isFetching && !isLoading && <p className="text-xs text-slate-400">Actualizando…</p>}

      {createOpen && (
        <CreateUserModal allowedRoles={allowedCreateRoles} onClose={() => setCreateOpen(false)} />
      )}
      {editingUser && (
        <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />
      )}
      {deactivatingUser && (
        <ConfirmDialog
          title="Desactivar usuario"
          description={`${deactivatingUser.name} no podrá iniciar sesión hasta que se reactive su cuenta. ¿Confirmás?`}
          confirmLabel="Desactivar"
          isLoading={isDeactivating}
          onConfirm={handleConfirmDeactivate}
          onCancel={() => setDeactivatingUser(null)}
        />
      )}
    </div>
  );
}
