import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          variant === 'primary' && 'bg-brand-600 text-white hover:bg-brand-700',
          variant === 'secondary' &&
            'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
          variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
          variant === 'ghost' && 'text-slate-600 hover:bg-slate-100',
          className,
        )}
        {...props}
      >
        {isLoading ? 'Cargando…' : children}
      </button>
    );
  },
);
Button.displayName = 'Button';
