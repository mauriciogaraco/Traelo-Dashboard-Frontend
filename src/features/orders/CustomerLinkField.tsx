import { CheckCircle2, Search, XCircle } from 'lucide-react';
import { Switch } from '@/components/ui/Switch';
import { MIN_PHONE_LENGTH_TO_SEARCH } from './useCustomerLookup';
import type { CustomerLookupDTO } from './ordersApi';

interface CustomerLinkFieldProps {
  phone: string;
  linked: boolean;
  onLinkedChange: (linked: boolean) => void;
  searchEligible: boolean;
  isSearching: boolean;
  foundCustomer: CustomerLookupDTO | null;
  notFound: boolean;
  /** El pedido ya tiene un cliente vinculado de antes (al crearlo o en una edición previa):
   * eso es permanente, ya le dimos los puntos — se muestra fijo, sin poder tocarlo. */
  alreadyLinked?: boolean;
}

export function CustomerLinkField({
  phone,
  linked,
  onLinkedChange,
  searchEligible,
  isSearching,
  foundCustomer,
  notFound,
  alreadyLinked,
}: CustomerLinkFieldProps) {
  if (alreadyLinked) {
    return (
      <div className="sm:col-span-2">
        <p className="flex items-center gap-1.5 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          Este pedido ya está vinculado a una cuenta registrada — le dimos sus puntos y no se
          puede cambiar.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <Switch
        checked={linked}
        onChange={onLinkedChange}
        label="Vincular cuenta de cliente registrado (le da puntos)"
      />
      {linked && (
        <div className="text-sm">
          {!searchEligible && phone.trim().length < MIN_PHONE_LENGTH_TO_SEARCH && (
            <p className="flex items-center gap-1.5 text-slate-400">
              <Search className="h-4 w-4" />
              Escribí el teléfono para buscar la cuenta.
            </p>
          )}
          {isSearching && (
            <p className="flex items-center gap-1.5 text-slate-500">
              <Search className="h-4 w-4 animate-pulse" />
              Buscando…
            </p>
          )}
          {foundCustomer && (
            <p className="flex items-center gap-1.5 text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              {foundCustomer.name} · {foundCustomer.pointsBalance.toLocaleString('es')} puntos —
              este pedido se vinculará a su cuenta.
            </p>
          )}
          {notFound && (
            <p className="flex items-center gap-1.5 text-amber-700">
              <XCircle className="h-4 w-4" />
              No se encontró ningún cliente registrado con ese teléfono.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
