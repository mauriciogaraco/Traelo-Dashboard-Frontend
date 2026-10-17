import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRegisterMutation } from '@/features/auth/authApi';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { FormSelect } from '@/components/ui/FormSelect';
import { Modal } from '@/components/ui/Modal';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { CityMultiSelect } from '@/features/cities/CityMultiSelect';
import { useListBusinessesQuery } from '@/features/businesses/businessesApi';
import { getErrorMessage } from '@/lib/getErrorMessage';
import { ROLE_LABEL } from '@/lib/labels';
import { Role } from '@/lib/types';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  email: z.email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(72),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || (v.length >= 6 && v.length <= 30), 'Debe tener entre 6 y 30 caracteres'),
  role: z.enum(Role),
});

type FormValues = z.infer<typeof schema>;

interface CreateUserModalProps {
  allowedRoles: Role[];
  onClose: () => void;
  // Cuando se crea el dueño desde el detalle de un negocio puntual: fija el negocio
  // y oculta el selector, en vez de dejar elegirlo.
  fixedBusinessId?: string;
  fixedBusinessName?: string;
}

export function CreateUserModal({
  allowedRoles,
  onClose,
  fixedBusinessId,
  fixedBusinessName,
}: CreateUserModalProps) {
  const [registerUser, { isLoading, error }] = useRegisterMutation();
  const [businessId, setBusinessId] = useState<string | null>(fixedBusinessId ?? null);
  const [cityIds, setCityIds] = useState<string[]>([]);
  const [businessError, setBusinessError] = useState<string | undefined>();
  const showRoleSelect = allowedRoles.length > 1;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', phone: '', role: allowedRoles[0] },
  });

  const role = watch('role');
  const isBusinessOwner = role === Role.BUSINESS_OWNER;
  const isCityScopable = role === Role.ADMIN || role === Role.EMPLOYEE;
  const { data: businessesData } = useListBusinessesQuery(
    { pageSize: 100, active: true },
    { skip: !isBusinessOwner || !!fixedBusinessId },
  );
  const businessOptions = (businessesData?.data ?? []).map((b) => ({ value: b.id, label: b.name }));

  async function onSubmit(values: FormValues) {
    if (values.role === Role.BUSINESS_OWNER && !businessId) {
      setBusinessError('Elegí el negocio que administra este dueño');
      return;
    }
    setBusinessError(undefined);
    await registerUser({
      name: values.name,
      email: values.email,
      password: values.password,
      phone: values.phone || undefined,
      role: values.role,
      ...(values.role === Role.BUSINESS_OWNER && businessId ? { businessId } : {}),
      ...(isCityScopable && cityIds.length > 0 ? { cityIds } : {}),
    }).unwrap();
    onClose();
  }

  return (
    <Modal title="Nuevo usuario" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField label="Nombre" error={errors.name?.message} {...register('name')} />
        <FormField
          label="Correo"
          type="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <FormField
          label="Contraseña"
          type="password"
          error={errors.password?.message}
          {...register('password')}
        />
        <FormField
          label="Teléfono (opcional)"
          error={errors.phone?.message}
          {...register('phone')}
        />
        {showRoleSelect && (
          <FormSelect label="Rol" error={errors.role?.message} {...register('role')}>
            {allowedRoles.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role]}
              </option>
            ))}
          </FormSelect>
        )}
        {isBusinessOwner &&
          (fixedBusinessId ? (
            <FormField label="Negocio que administra" value={fixedBusinessName ?? ''} disabled readOnly />
          ) : (
            <SearchableSelect
              label="Negocio que administra"
              value={businessId}
              onChange={setBusinessId}
              options={businessOptions}
              placeholder="Buscar negocio…"
              error={businessError}
              allowClear={false}
            />
          ))}
        {isCityScopable && (
          <CityMultiSelect
            label="Ciudades que puede gestionar"
            value={cityIds}
            onChange={setCityIds}
            emptyHint="Sin elegir ninguna: acceso a todas las ciudades."
          />
        )}
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
