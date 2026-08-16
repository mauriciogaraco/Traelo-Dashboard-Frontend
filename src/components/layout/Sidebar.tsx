import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useAppSelector } from '@/app/hooks';
import { navItems } from './nav';

export function Sidebar() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const items = navItems.filter((item) => !role || item.roles.includes(role));

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white sm:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-6">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 font-display text-sm font-bold text-white shadow-sm shadow-brand-600/30">
          T
        </span>
        <div className="leading-tight">
          <p className="font-display text-[15px] font-semibold text-slate-900">Tráelo</p>
          <p className="text-xs text-slate-400">Operaciones</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
