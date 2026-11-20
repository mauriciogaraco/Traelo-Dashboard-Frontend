import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useListBusinessesQuery } from '@/features/businesses/businessesApi';
import { useListCitiesQuery } from '@/features/cities/citiesApi';
import { useListUsersQuery } from '@/features/users/usersApi';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { Role } from '@/lib/types';
import { useCreatePosBusinessMutation, type CreatePosBusinessInput } from './posApi';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(150),
  phone: z.string().max(30),
  address: z.string().max(300),
  durationDays: z
    .string()
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 3660,
      'Entre 1 y 3660 días',
    ),
  adminName: z.string().max(100),
  adminEmail: z.string().max(254),
  adminPassword: z.string().max(200),
});

type FormValues = z.infer<typeof schema>;
type Source = 'catalog' | 'new';
type AdminMode = 'owner' | 'new';

const radio = 'flex items-start gap-2 text-sm text-slate-700';

// Crea un negocio en el POS: o a partir de un negocio que ya existe en el catálogo (se toman sus datos y, si quieres, su usuario
// dueño como administrador del POS) o un negocio nuevo solo del POS. Siempre queda un administrador para que pueda entrar.
export function CreatePosBusinessModal({ onClose }: { onClose: () => void }) {
  const [createPosBusiness, { isLoading, error }] = useCreatePosBusinessMutation();
  const [source, setSource] = useState<Source>('catalog');
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [adminChoice, setAdminChoice] = useState<AdminMode>('owner');
  const [cityId, setCityId] = useState<string | null>(null);
  const [cityError, setCityError] = useState<string | undefined>();
  const [businessError, setBusinessError] = useState<string | undefined>();

  const { data: citiesData } = useListCitiesQuery({ active: true, pageSize: 100 });
  const cityOptions = (citiesData?.data ?? []).map((c) => ({ value: c.id, label: c.name }));
  const { data: businessesData } = useListBusinessesQuery({ pageSize: 100 });
  const businesses = businessesData?.data ?? [];
  const businessOptions = businesses.map((b) => ({
    value: b.id,
    label: b.name,
    sublabel: b.cityName ?? undefined,
  }));
  const { data: ownersData } = useListUsersQuery({ role: Role.BUSINESS_OWNER, pageSize: 100 });
  const owner =
    source === 'catalog' && businessId
      ? ((ownersData?.data ?? []).find((u) => u.businessId === businessId && u.active) ?? null)
      : null;
  // Sin dueño activo no hay a quién tomar: el administrador será una persona nueva.
  const adminMode: AdminMode = source === 'catalog' && owner ? adminChoice : 'new';

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      phone: '',
      address: '',
      durationDays: '30',
      adminName: '',
      adminEmail: '',
      adminPassword: '',
    },
  });

  function pickBusiness(id: string | null) {
    setBusinessId(id);
    setBusinessError(undefined);
    const b = businesses.find((x) => x.id === id);
    if (!b) return;
    setValue('name', b.name, { shouldValidate: true });
    setValue('phone', b.phone ?? '');
    setValue('address', b.address ?? '');
    setCityId(b.cityId ?? null);
    setAdminChoice('owner');
  }

  function changeSource(next: Source) {
    setSource(next);
    setBusinessError(undefined);
    if (next === 'new') setBusinessId(null);
  }

  async function onSubmit(values: FormValues) {
    if (source === 'catalog' && !businessId) {
      setBusinessError('Elige el negocio');
      return;
    }
    if (!cityId) {
      setCityError('Elige la ciudad del negocio');
      return;
    }
    setCityError(undefined);

    let admin: CreatePosBusinessInput['admin'];
    if (adminMode === 'owner') {
      admin = { from: 'catalog_owner' };
    } else {
      const name = values.adminName.trim();
      const email = values.adminEmail.trim();
      let invalid = false;
      if (!name) {
        setError('adminName', { message: 'Escribe el nombre' });
        invalid = true;
      }
      if (!z.email().safeParse(email).success) {
        setError('adminEmail', { message: 'Correo inválido' });
        invalid = true;
      }
      const bytes = new TextEncoder().encode(values.adminPassword).length;
      if (values.adminPassword.length < 8 || bytes > 72) {
        setError('adminPassword', { message: 'Entre 8 caracteres y 72 bytes' });
        invalid = true;
      }
      if (invalid) return;
      admin = { from: 'new', name, email, password: values.adminPassword };
    }

    try {
      await createPosBusiness({
        name: values.name.trim(),
        cityId,
        phone: values.phone.trim() || undefined,
        address: values.address.trim() || undefined,
        businessId: businessId ?? undefined,
        durationDays: Number(values.durationDays),
        admin,
      }).unwrap();
      onClose();
    } catch {
      // El mensaje del servidor se muestra abajo (`error`).
    }
  }

  return (
    <Modal title="Nuevo negocio POS" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-slate-700">¿De dónde sale el negocio?</legend>
          <label className={radio}>
            <input
              type="radio"
              name="source"
              checked={source === 'catalog'}
              onChange={() => changeSource('catalog')}
            />
            <span>Un negocio que ya existe en Tráelo (toma sus datos y su usuario)</span>
          </label>
          <label className={radio}>
            <input
              type="radio"
              name="source"
              checked={source === 'new'}
              onChange={() => changeSource('new')}
            />
            <span>Un negocio nuevo, solo del POS</span>
          </label>
        </fieldset>

        {source === 'catalog' && (
          <SearchableSelect
            label="Negocio"
            value={businessId}
            onChange={pickBusiness}
            options={businessOptions}
            placeholder="Buscar negocio…"
            error={businessError}
            allowClear={false}
          />
        )}

        <FormField label="Nombre" error={errors.name?.message} {...register('name')} />
        <SearchableSelect
          label="Ciudad"
          value={cityId}
          onChange={setCityId}
          options={cityOptions}
          placeholder="Elegir ciudad…"
          error={cityError}
          allowClear={false}
        />
        <FormField label="Teléfono (opcional)" error={errors.phone?.message} {...register('phone')} />
        <FormField label="Dirección (opcional)" error={errors.address?.message} {...register('address')} />
        <FormField
          label="Duración de la suscripción (días)"
          type="number"
          min={1}
          error={errors.durationDays?.message}
          {...register('durationDays')}
        />

        <fieldset className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-sm font-medium text-slate-700">Administrador del POS</legend>
          {source === 'catalog' && businessId && (
            <label className={radio}>
              <input
                type="radio"
                name="adminMode"
                disabled={!owner}
                checked={adminMode === 'owner'}
                onChange={() => setAdminChoice('owner')}
              />
              <span>
                {owner ? (
                  <>
                    Usar al dueño del negocio: <strong>{owner.name}</strong> ({owner.email}). Entra con la misma
                    contraseña que en Tráelo.
                  </>
                ) : (
                  'Este negocio no tiene un usuario dueño activo en el catálogo.'
                )}
              </span>
            </label>
          )}
          <label className={radio}>
            <input
              type="radio"
              name="adminMode"
              checked={adminMode === 'new'}
              onChange={() => setAdminChoice('new')}
            />
            <span>Añadir un administrador nuevo</span>
          </label>
          {adminMode === 'new' && (
            <div className="mt-1 flex flex-col gap-3">
              <FormField label="Nombre" error={errors.adminName?.message} {...register('adminName')} />
              <FormField
                label="Correo"
                type="email"
                autoComplete="off"
                error={errors.adminEmail?.message}
                {...register('adminEmail')}
              />
              <FormField
                label="Contraseña inicial"
                type="password"
                autoComplete="new-password"
                error={errors.adminPassword?.message}
                {...register('adminPassword')}
              />
            </div>
          )}
          <p className="text-xs text-slate-500">
            Después podrás crear más usuarios (cajeros u otros administradores) y elegir los módulos de cada uno.
          </p>
        </fieldset>

        {error && <p className="text-sm text-red-600">{getErrorMessage(error)}</p>}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Crear negocio POS
          </Button>
        </div>
      </form>
    </Modal>
  );
}
