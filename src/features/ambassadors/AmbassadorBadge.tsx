import { Gem, Medal } from 'lucide-react';
import clsx from 'clsx';
import type { AmbassadorTier } from './ambassadorsApi';

interface AmbassadorBadgeProps {
  tier: AmbassadorTier;
  className?: string;
}

/** Medallita de oro (embajador) o de diamante (embajador especial), igual que la insignia del perfil del cliente. */
export function AmbassadorBadge({ tier, className }: AmbassadorBadgeProps) {
  const special = tier === 'SPECIAL';
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        special ? 'bg-cyan-100 text-cyan-800' : 'bg-amber-100 text-amber-800',
        className,
      )}
    >
      {special ? <Gem className="h-3.5 w-3.5" /> : <Medal className="h-3.5 w-3.5" />}
      {special ? 'Embajador especial' : 'Embajador'}
    </span>
  );
}
