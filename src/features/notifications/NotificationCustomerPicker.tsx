import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useListAppCustomersQuery } from '@/features/appCustomers/appCustomersApi';

export interface PickedCustomer {
  id: string;
  name: string;
  phone: string;
}

interface NotificationCustomerPickerProps {
  value: PickedCustomer | null;
  onChange: (customer: PickedCustomer | null) => void;
  error?: string;
}

/** Busca un cliente de la app por nombre o teléfono (la búsqueda la hace el servidor) y lo elige. */
export function NotificationCustomerPicker({ value, onChange, error }: NotificationCustomerPickerProps) {
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');

  // Espera a que termine de escribir para no pedir una búsqueda por cada letra.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);

  const enabled = !value && search.length >= 2;
  const { data, isFetching } = useListAppCustomersQuery({ search, pageSize: 8 }, { skip: !enabled });
  const results = enabled ? (data?.data ?? []) : [];

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700">Cliente</span>
      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <span className="min-w-0 truncate">
            <span className="font-medium text-slate-900">{value.name}</span>
            <span className="ml-2 text-slate-500">{value.phone}</span>
          </span>
          <button
            type="button"
            aria-label="Quitar cliente"
            onClick={() => onChange(null)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Buscar por nombre o teléfono…"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          {enabled && (
            <ul className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white">
              {isFetching && results.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">Buscando…</li>}
              {!isFetching && results.length === 0 && (
                <li className="px-3 py-2 text-sm text-slate-400">No se encontró ningún cliente.</li>
              )}
              {results.map((customer) => (
                <li key={customer.id}>
                  <button
                    type="button"
                    onClick={() => onChange({ id: customer.id, name: customer.name, phone: customer.phone })}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="truncate font-medium text-slate-900">{customer.name}</span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {customer.phone}
                      {!customer.hasPush && ' · sin notificaciones'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
