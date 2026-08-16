import type { ReactNode } from 'react';
import clsx from 'clsx';

interface BadgeProps {
  children: ReactNode;
  tone?: 'slate' | 'green' | 'red' | 'amber' | 'brand';
}

const TONE_CLASSES: Record<NonNullable<BadgeProps['tone']>, string> = {
  slate: 'bg-slate-100 text-slate-600',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  brand: 'bg-brand-100 text-brand-700',
};

export function Badge({ children, tone = 'slate' }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  );
}
