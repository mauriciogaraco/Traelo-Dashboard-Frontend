import { Check, MapPin } from 'lucide-react';
import clsx from 'clsx';
import { Modal } from '@/components/ui/Modal';
import type { ActiveLocationId, LocationOption } from './LocationContext';

interface LocationChooserModalProps {
  locations: LocationOption[];
  canViewAll: boolean;
  activeLocationId: ActiveLocationId | null;
  /** Ausente = elección obligatoria (no se puede cerrar sin elegir). */
  onClose?: () => void;
  onSelect: (id: ActiveLocationId) => void;
}

export function LocationChooserModal({
  locations,
  canViewAll,
  activeLocationId,
  onClose,
  onSelect,
}: LocationChooserModalProps) {
  const options: { id: ActiveLocationId; label: string; hint: string }[] = [
    ...locations.map((loc) => ({ id: loc.id, label: loc.name, hint: 'Solo esta ciudad' })),
    ...(canViewAll
      ? [{ id: 'ALL', label: 'Todas las ciudades', hint: 'Pedidos, mensajeros y datos de todas' }]
      : []),
  ];

  return (
    <Modal title="¿Qué ciudad vas a gestionar?" onClose={onClose ?? (() => undefined)}>
      <p className="-mt-2 mb-4 text-sm text-slate-500">
        Pedidos, mensajeros, negocios, productos y estadísticas se mostrarán solo de la ciudad que
        elijas. Puedes cambiarla cuando quieras desde la barra superior.
      </p>
      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const selected = option.id === activeLocationId;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={clsx(
                'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                selected
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50',
              )}
            >
              <MapPin className="h-5 w-5 shrink-0 text-brand-600" />
              <span className="flex-1">
                <span className="block text-sm font-semibold text-slate-900">{option.label}</span>
                <span className="block text-xs text-slate-500">{option.hint}</span>
              </span>
              {selected && <Check className="h-4 w-4 text-brand-600" />}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
