import { MapPin } from 'lucide-react';
import { useActiveLocation } from './LocationContext';

/** Botón del topbar con la ciudad activa; abre el modal para cambiarla. Oculto sin nada que elegir. */
export function LocationSelector() {
  const { canChoose, activeLocationName, openChooser } = useActiveLocation();
  if (!canChoose || !activeLocationName) return null;

  return (
    <button
      type="button"
      onClick={openChooser}
      title="Cambiar de ciudad"
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 sm:px-3"
    >
      <MapPin className="h-4 w-4 text-brand-600" />
      <span className="max-w-[9rem] truncate">{activeLocationName}</span>
    </button>
  );
}
