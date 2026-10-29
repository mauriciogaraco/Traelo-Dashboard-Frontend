import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Gem, Medal, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { useListAppCustomersQuery } from '@/features/appCustomers/appCustomersApi';
import { getErrorMessage } from '@/lib/getErrorMessage';
import {
  useGrantAmbassadorMutation,
  useUpdateAmbassadorMutation,
  type AmbassadorDTO,
  type AmbassadorTier,
} from './ambassadorsApi';

interface AmbassadorFormModalProps {
  /** Ausente = crear (hay que elegir el cliente). Presente = editar ese embajador. */
  ambassador?: AmbassadorDTO;
  onClose: () => void;
}

// "2026-11-30T04:59:59.999Z" -> "2026-11-30" en hora local, para el campo de fecha.
function toDateInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// El inicio es a las 00:00 y el fin a las 23:59 del día elegido, en hora local.
function fromDateInput(value: string, endOfDay: boolean): string | null {
  if (!value) return null;
  return new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`).toISOString();
}

function CustomerPicker({
  selectedName,
  onPick,
}: {
  selectedName: string | null;
  onPick: (customer: { id: string; name: string; phone: string }) => void;
}) {
  const [search, setSearch] = useState('');
  const { data, isFetching } = useListAppCustomersQuery(
    { search: search.trim(), pageSize: 6 },
    { skip: search.trim().length < 2 },
  );
  const results = data?.data ?? [];

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">Cliente de la app</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={selectedName ?? 'Buscar por nombre o teléfono…'}
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-base focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
        />
      </div>
      {selectedName && search.trim().length < 2 && (
        <p className="text-sm text-slate-600">
          Elegido: <span className="font-medium text-slate-900">{selectedName}</span>
        </p>
      )}
      {search.trim().length >= 2 && (
        <ul className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
          {isFetching && <li className="px-3 py-2 text-sm text-slate-400">Buscando…</li>}
          {!isFetching && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-400">Sin resultados.</li>
          )}
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onPick({ id: c.id, name: c.name, phone: c.phone });
                  setSearch('');
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-slate-900">{c.name}</span>
                <span className="text-xs text-slate-500">{c.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const TIER_OPTIONS: { tier: AmbassadorTier; title: string; hint: string; icon: typeof Medal }[] = [
  {
    tier: 'AMBASSADOR',
    title: 'Embajador',
    hint: 'Medalla de oro. Bono de 500 puntos cada 10 referidos que completan su primera compra (además de los 50 por referido que ya gana todo cliente).',
    icon: Medal,
  },
  {
    tier: 'SPECIAL',
    title: 'Embajador especial',
    hint: 'Medalla de diamante. Además, durante un periodo recibe puntos fijos por cada pedido de sus referidos.',
    icon: Gem,
  },
];

export function AmbassadorFormModal({ ambassador, onClose }: AmbassadorFormModalProps) {
  const editing = !!ambassador;
  const [grant, { isLoading: isGranting, error: grantError }] = useGrantAmbassadorMutation();
  const [update, { isLoading: isUpdating, error: updateError }] = useUpdateAmbassadorMutation();

  const [customer, setCustomer] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [tier, setTier] = useState<AmbassadorTier>(ambassador?.tier ?? 'AMBASSADOR');
  const [startsAt, setStartsAt] = useState(toDateInput(ambassador?.specialStartsAt ?? null));
  const [endsAt, setEndsAt] = useState(toDateInput(ambassador?.specialEndsAt ?? null));
  const [allOrders, setAllOrders] = useState(ambassador?.specialAllOrders ?? false);
  const [points, setPoints] = useState(
    ambassador && ambassador.specialPointsPerOrder > 0 ? String(ambassador.specialPointsPerOrder) : '',
  );
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => setFormError(null), [tier, startsAt, endsAt, points, customer]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing && !customer) {
      setFormError('Elige el cliente que va a ser embajador.');
      return;
    }
    const body =
      tier === 'SPECIAL'
        ? {
            tier,
            specialStartsAt: fromDateInput(startsAt, false),
            specialEndsAt: fromDateInput(endsAt, true),
            specialAllOrders: allOrders,
            specialPointsPerOrder: Number(points) || 0,
          }
        : { tier };
    if (tier === 'SPECIAL') {
      if (!(Number(points) > 0)) {
        setFormError('Pon cuántos puntos recibe por cada pedido (mayor que 0).');
        return;
      }
      if (startsAt && endsAt && startsAt > endsAt) {
        setFormError('La fecha de fin debe ser posterior a la de inicio.');
        return;
      }
    }
    try {
      if (editing && ambassador) {
        await update({ customerId: ambassador.customerId, body }).unwrap();
      } else if (customer) {
        await grant({ customerId: customer.id, ...body, tier }).unwrap();
      }
      onClose();
    } catch {
      /* el mensaje sale de grantError / updateError */
    }
  }

  const error = formError ?? (grantError || updateError ? getErrorMessage((grantError ?? updateError)!) : null);

  return (
    <Modal title={editing ? `Editar a ${ambassador.name}` : 'Nuevo embajador'} onClose={onClose} widthClassName="max-w-lg">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {!editing && <CustomerPicker selectedName={customer?.name ?? null} onPick={setCustomer} />}

        <div className="flex flex-col gap-2">
          {TIER_OPTIONS.map(({ tier: t, title, hint, icon: Icon }) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              className={clsx(
                'flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                tier === t ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50',
              )}
            >
              <Icon className={clsx('mt-0.5 h-5 w-5 shrink-0', t === 'SPECIAL' ? 'text-cyan-600' : 'text-amber-500')} />
              <span>
                <span className="block text-sm font-semibold text-slate-900">{title}</span>
                <span className="block text-xs text-slate-500">{hint}</span>
              </span>
            </button>
          ))}
        </div>

        {tier === 'SPECIAL' && (
          <div className="flex flex-col gap-3 rounded-xl border border-cyan-200 bg-cyan-50/50 p-3">
            <p className="text-xs text-slate-600">
              Periodo en el que recibe puntos por pedido (déjalo vacío para no poner límite de ese lado). Fuera del
              periodo vuelve a verse como embajador.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Desde" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              <FormField label="Hasta" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
            <FormField
              label="Puntos por cada pedido"
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="Ej. 20"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
            <div className="flex flex-col gap-1">
              <Switch checked={allOrders} onChange={setAllOrders} label="Todos los pedidos de cada referido" />
              <p className="text-xs text-slate-500">
                {allOrders
                  ? 'Recibe esos puntos con cada pedido completado de sus referidos.'
                  : 'Recibe esos puntos solo con el primer pedido de cada referido.'}
              </p>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isGranting || isUpdating}>
            {editing ? 'Guardar' : 'Nombrar embajador'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
