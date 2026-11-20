import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { FormSelect } from '@/components/ui/FormSelect';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';
import { formatDateTime } from '@/lib/formatDate';
import { getErrorMessage } from '@/lib/getErrorMessage';
import {
  useCreatePosAccountMutation,
  useListPosAccountsQuery,
  useUpdatePosAccountMutation,
  type PosAccountDTO,
} from './posApi';

const ROLE_LABEL: Record<PosAccountDTO['role'], string> = { admin: 'Administrador', cashier: 'Cajero' };

const passwordRule = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .refine((p) => new TextEncoder().encode(p).length <= 72, 'Demasiado larga (máximo 72 bytes)');

const createSchema = z.object({
  name: z.string().trim().min(1, 'Escribe el nombre').max(100),
  email: z.email('Correo inválido'),
  role: z.enum(['admin', 'cashier']),
  password: passwordRule,
});
type CreateValues = z.infer<typeof createSchema>;

// Las personas que usan el POS de este negocio: cada una entra con correo y contraseña (una vez cada 30 días) y el rol sale de
// su cuenta; en el día a día usan su PIN en el teléfono. El servidor valida y firma el rol.
export function PosAccountsCard({ businessId }: { businessId: string }) {
  const { data, isLoading, isError } = useListPosAccountsQuery(businessId);
  const [update] = useUpdatePosAccountMutation();
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<PosAccountDTO | null>(null);

  const accounts = data?.data ?? [];
  const change = async (account: PosAccountDTO, body: { role?: PosAccountDTO['role']; active?: boolean }, ok: string) => {
    try {
      await update({ businessId, accountId: account.id, ...body }).unwrap();
      showToast(ok);
    } catch (e) {
      showToast(getErrorMessage(e as Parameters<typeof getErrorMessage>[0]), 'error');
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Usuarios del negocio</h2>
          <p className="text-xs text-slate-500">
            Entran con correo y contraseña (se vuelve a pedir cada 30 días); el rol sale de la cuenta.
          </p>
        </div>
        <Button type="button" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Usuario</th>
              <th className="px-3 py-2 font-medium">Rol</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Último acceso</th>
              <th className="px-3 py-2 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-red-600">
                  No se pudieron cargar los usuarios.
                </td>
              </tr>
            )}
            {!isLoading && !isError && accounts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                  Este negocio todavía no tiene usuarios. Crea al administrador para que pueda entrar.
                </td>
              </tr>
            )}
            {accounts.map((a) => (
              <tr key={a.id} className="text-slate-700">
                <td className="px-3 py-3">
                  <div className="font-medium text-slate-900">{a.name}</div>
                  <div className="text-xs text-slate-500">{a.email}</div>
                </td>
                <td className="px-3 py-3">
                  <Badge tone={a.role === 'admin' ? 'brand' : 'slate'}>{ROLE_LABEL[a.role]}</Badge>
                </td>
                <td className="px-3 py-3">
                  {a.lockedUntil ? (
                    <Badge tone="amber">Bloqueado hasta {formatDateTime(a.lockedUntil)}</Badge>
                  ) : (
                    <Badge tone={a.active ? 'green' : 'red'}>{a.active ? 'Activo' : 'Desactivado'}</Badge>
                  )}
                </td>
                <td className="px-3 py-3">{formatDateTime(a.lastLoginAt)}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        change(
                          a,
                          { role: a.role === 'admin' ? 'cashier' : 'admin' },
                          `${a.name} ahora es ${ROLE_LABEL[a.role === 'admin' ? 'cashier' : 'admin'].toLowerCase()}.`,
                        )
                      }
                    >
                      Pasar a {ROLE_LABEL[a.role === 'admin' ? 'cashier' : 'admin'].toLowerCase()}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setResetting(a)}>
                      Restablecer contraseña
                    </Button>
                    <Button
                      type="button"
                      variant={a.active ? 'danger' : 'primary'}
                      onClick={() =>
                        change(a, { active: !a.active }, a.active ? `${a.name} fue desactivado.` : `${a.name} fue activado.`)
                      }
                    >
                      {a.active ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Los cambios de rol, de estado y de contraseña surten efecto cuando la persona vuelve a iniciar sesión con su cuenta.
      </p>

      {creating && <CreateAccountModal businessId={businessId} onClose={() => setCreating(false)} />}
      {resetting && (
        <ResetPasswordModal businessId={businessId} account={resetting} onClose={() => setResetting(null)} />
      )}
    </section>
  );
}

function CreateAccountModal({ businessId, onClose }: { businessId: string; onClose: () => void }) {
  const [create, { isLoading, error }] = useCreatePosAccountMutation();
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', email: '', role: 'cashier', password: '' },
  });

  async function onSubmit(values: CreateValues) {
    await create({ businessId, ...values }).unwrap();
    showToast(`Usuario ${values.name} creado.`);
    onClose();
  }

  return (
    <Modal title="Nuevo usuario" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label="Nombre" error={errors.name?.message} {...register('name')} />
        <FormField label="Correo" type="email" autoComplete="off" error={errors.email?.message} {...register('email')} />
        <FormSelect label="Rol" error={errors.role?.message} {...register('role')}>
          <option value="cashier">Cajero (vende, cierra turno; lo demás según los permisos del cajero)</option>
          <option value="admin">Administrador (acceso a todo)</option>
        </FormSelect>
        <FormField
          label="Contraseña inicial"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Crear usuario
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({
  businessId,
  account,
  onClose,
}: {
  businessId: string;
  account: PosAccountDTO;
  onClose: () => void;
}) {
  const [update, { isLoading, error }] = useUpdatePosAccountMutation();
  const { showToast } = useToast();
  const schema = z.object({ password: passwordRule });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ password: string }>({ resolver: zodResolver(schema), defaultValues: { password: '' } });

  async function onSubmit(values: { password: string }) {
    await update({ businessId, accountId: account.id, password: values.password }).unwrap();
    showToast(`Contraseña de ${account.name} restablecida.`);
    onClose();
  }

  return (
    <Modal title={`Restablecer contraseña de ${account.name}`} onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <p className="-mt-2 text-xs text-slate-500">
          También quita el bloqueo por intentos fallidos. Entrégale la contraseña nueva a la persona.
        </p>
        <FormField
          label="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Restablecer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
