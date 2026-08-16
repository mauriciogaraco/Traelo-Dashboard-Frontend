import type { ReactNode } from 'react';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 font-display text-xl font-bold text-white shadow-md shadow-brand-600/30">
            T
          </span>
          <div>
            <p className="font-display text-2xl font-semibold text-slate-900">Tráelo</p>
            <p className="text-sm text-slate-400">Operaciones</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-lg font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="mb-6 text-sm text-slate-500">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
