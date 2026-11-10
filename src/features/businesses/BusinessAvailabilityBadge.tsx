import { Badge } from '@/components/ui/Badge';

// Tres situaciones que antes se mezclaban bajo "cerrado":
//  - Pausado (acceptingOrders=false): lo apagó alguien a mano. NO aparece en la web del cliente.
//  - Cerrado (fuera de horario, día cerrado o cierre excepcional): SÍ aparece, marcado como cerrado.
//  - Abierto: recibe pedidos ahora.
export type BusinessAvailability = 'INACTIVE' | 'PAUSED' | 'CLOSED' | 'OPEN';

export function getBusinessAvailability(
  business: { active: boolean; acceptingOrders: boolean },
  isOpenNow: boolean | undefined,
): BusinessAvailability {
  if (!business.active) return 'INACTIVE';
  if (!business.acceptingOrders) return 'PAUSED';
  // Mientras no llega el estado del servidor no se afirma "cerrado".
  if (isOpenNow === false) return 'CLOSED';
  return 'OPEN';
}

const CONFIG: Record<
  BusinessAvailability,
  { label: string; tone: 'slate' | 'green' | 'red' | 'amber'; hint: string }
> = {
  INACTIVE: { label: 'Inactivo', tone: 'slate', hint: 'Desactivado: no aparece en la web del cliente.' },
  PAUSED: {
    label: 'No acepta pedidos',
    tone: 'amber',
    hint: 'Pausado a mano: NO aparece en la web del cliente.',
  },
  CLOSED: {
    label: 'Cerrado',
    tone: 'red',
    hint: 'Fuera de horario o con cierre: aparece en la web del cliente como cerrado.',
  },
  OPEN: { label: 'Abierto', tone: 'green', hint: 'Recibiendo pedidos ahora.' },
};

export function BusinessAvailabilityBadge({
  business,
  isOpenNow,
}: {
  business: { active: boolean; acceptingOrders: boolean };
  isOpenNow: boolean | undefined;
}) {
  const cfg = CONFIG[getBusinessAvailability(business, isOpenNow)];
  return (
    <span title={cfg.hint}>
      <Badge tone={cfg.tone}>{cfg.label}</Badge>
    </span>
  );
}
