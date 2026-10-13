import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CreateUserModal } from '@/features/users/CreateUserModal';
import { EditUserModal } from '@/features/users/EditUserModal';
import { useListUsersQuery } from '@/features/users/usersApi';
import type { BusinessDTO } from '@/lib/types';
import { Role } from '@/lib/types';

interface OwnerTabProps {
  business: BusinessDTO;
}

export function OwnerTab({ business }: OwnerTabProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useListUsersQuery({ role: Role.BUSINESS_OWNER, pageSize: 100 });
  const owner = data?.data.find((user) => user.businessId === business.id);

  if (isLoading) {
    return <p className="text-slate-400">Cargando…</p>;
  }

  if (!owner) {
    return (
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Este negocio no tiene un usuario dueño asignado.</p>
        <Button type="button" className="mt-3" onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Crear usuario dueño
        </Button>
        {createOpen && (
          <CreateUserModal
            allowedRoles={[Role.BUSINESS_OWNER]}
            fixedBusinessId={business.id}
            fixedBusinessName={business.name}
            onClose={() => setCreateOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Usuario dueño</h2>
        <Badge tone={owner.active ? 'green' : 'slate'}>{owner.active ? 'Activo' : 'Inactivo'}</Badge>
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Nombre</dt>
          <dd className="font-medium text-slate-900">{owner.name}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Correo</dt>
          <dd className="font-medium text-slate-900">{owner.email}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Teléfono</dt>
          <dd className="font-medium text-slate-900">{owner.phone ?? '—'}</dd>
        </div>
      </dl>
      <Button type="button" variant="secondary" className="mt-4" onClick={() => setEditOpen(true)}>
        Editar / cambiar contraseña
      </Button>
      {editOpen && <EditUserModal user={owner} onClose={() => setEditOpen(false)} />}
    </div>
  );
}
