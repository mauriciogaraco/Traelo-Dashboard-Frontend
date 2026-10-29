import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

interface OrderFormActionsProps {
  cancelTo: string;
  submitLabel: string;
  isSubmitting: boolean;
  /** Productos + mensajería (sin el Servicio Tráelo, que calcula el servidor). */
  total: number;
}

/**
 * Acciones del formulario de pedido. En móvil quedan fijas al pie de la pantalla (con el total a la
 * vista) para no tener que bajar hasta el final de un formulario largo; desde `sm` es la fila de
 * siempre, alineada a la derecha.
 */
export function OrderFormActions({ cancelTo, submitLabel, isSubmitting, total }: OrderFormActionsProps) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:m-0 sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      <p className="text-sm leading-tight text-slate-500 sm:hidden">
        Productos + mensajería
        <span className="block text-base font-semibold text-slate-900">{total} CUP</span>
      </p>
      <div className="flex gap-2 sm:gap-3">
        <Link to={cancelTo}>
          <Button type="button" variant="secondary">
            Cancelar
          </Button>
        </Link>
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
