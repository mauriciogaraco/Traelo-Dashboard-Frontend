import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { useAppSelector } from '@/app/hooks';
import logo from '@/assets/logo.webp';
import { navItems } from './nav';

function BrandMark() {
  return (
    <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-6">
      <img
        src={logo}
        alt="Tráelo"
        className="h-8 w-8 shrink-0 rounded-lg object-cover shadow-sm shadow-brand-600/30"
      />
      <div className="leading-tight">
        <p className="font-display text-[15px] font-semibold text-slate-900">Tráelo</p>
        <p className="text-xs text-slate-400">Operaciones</p>
      </div>
    </div>
  );
}

interface NavListProps {
  onNavigate?: () => void;
}

function NavList({ onNavigate }: NavListProps) {
  const role = useAppSelector((state) => state.auth.user?.role);
  const items = navItems.filter((item) => !role || item.roles.includes(role));

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
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
  );
}

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      {/* Desktop: sidebar fija */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white sm:flex">
        <BrandMark />
        <NavList />
      </aside>

      {/* Mobile: drawer superpuesto */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <BrandMark />
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Cerrar menú"
              className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
            <NavList onNavigate={onCloseMobile} />
          </aside>
        </div>
      )}
    </>
  );
}
