import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, X } from 'lucide-react';
import clsx from 'clsx';
import { useAppSelector } from '@/app/hooks';
import logo from '@/assets/logo.webp';
import { isNavGroup, visibleNavEntries, type NavGroup, type NavItem } from './nav';

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

interface NavLeafLinkProps {
  item: NavItem;
  onNavigate?: () => void;
}

function NavLeafLink({ item, onNavigate }: NavLeafLinkProps) {
  const Icon = item.icon;
  return (
    <NavLink
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
}

function isPathActive(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

interface NavGroupSectionProps {
  group: NavGroup;
  open: boolean;
  hasActiveChild: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}

function NavGroupSection({
  group,
  open,
  hasActiveChild,
  onToggle,
  onNavigate,
}: NavGroupSectionProps) {
  const Icon = group.icon;
  const panelId = `nav-group-${group.label}`;
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={clsx(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          hasActiveChild && !open
            ? 'text-brand-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        )}
      >
        <Icon className="h-4 w-4" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={clsx('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div id={panelId} className="ml-5 mt-1 space-y-1 border-l border-slate-200 pl-2">
          {group.children.map((child) => (
            <NavLeafLink key={child.to} item={child} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

function NavList({ onNavigate }: NavListProps) {
  const role = useAppSelector((state) => state.auth.user?.role);
  const { pathname } = useLocation();
  const entries = useMemo(() => visibleNavEntries(role), [role]);

  // Qué grupos el usuario abrió/cerró a mano; lo que no está acá se decide solo: abierto si la
  // página actual es uno de sus hijos.
  const [manual, setManual] = useState<Record<string, boolean>>({});

  // Al navegar a otra sección (p. ej. con un link interno), se suelta la decisión manual de
  // esa sección para que el grupo que contiene la página actual se vea abierto.
  useEffect(() => {
    setManual((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const entry of entries) {
        if (isNavGroup(entry) && entry.children.some((c) => isPathActive(pathname, c.to))) {
          if (next[entry.label] === false) {
            delete next[entry.label];
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [pathname, entries]);

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {entries.map((entry) => {
        if (!isNavGroup(entry)) {
          return <NavLeafLink key={entry.to} item={entry} onNavigate={onNavigate} />;
        }
        const hasActiveChild = entry.children.some((c) => isPathActive(pathname, c.to));
        const open = manual[entry.label] ?? hasActiveChild;
        return (
          <NavGroupSection
            key={entry.label}
            group={entry}
            open={open}
            hasActiveChild={hasActiveChild}
            onToggle={() => setManual((prev) => ({ ...prev, [entry.label]: !open }))}
            onNavigate={onNavigate}
          />
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
