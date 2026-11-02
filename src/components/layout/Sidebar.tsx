import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, X } from 'lucide-react';
import clsx from 'clsx';
import { useAppSelector } from '@/app/hooks';
import isotipo from '@/assets/isotipo.png';
import { useListProductProposalsQuery } from '@/features/productProposals/productProposalsApi';
import { isNavGroup, visibleNavEntries, type NavGroup, type NavItem } from './nav';

function BrandMark() {
  return (
    <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-6">
      <img src={isotipo} alt="Tráelo" className="h-9 w-9 shrink-0 object-contain" />
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

/** Globo con la cantidad de pendientes por revisar; no se dibuja si no hay ninguno. */
function CountBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={label}
      className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold leading-5 text-white"
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

interface NavLeafLinkProps {
  item: NavItem;
  onNavigate?: () => void;
  /** Cantidad pendiente por revisar de esta pantalla (0 o ausente = sin globo). */
  badgeCount?: number;
}

function NavLeafLink({ item, onNavigate, badgeCount = 0 }: NavLeafLinkProps) {
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
      <CountBadge count={badgeCount} label={`${badgeCount} pendientes`} />
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
  /** Pendientes por revisar de cada pantalla del grupo, por ruta. */
  badgeCounts: Record<string, number>;
}

function NavGroupSection({
  group,
  open,
  hasActiveChild,
  onToggle,
  onNavigate,
  badgeCounts,
}: NavGroupSectionProps) {
  const Icon = group.icon;
  // Con el grupo cerrado los globos de sus pantallas no se ven: se suman en el título del grupo.
  const groupPending = open ? 0 : group.children.reduce((sum, child) => sum + (badgeCounts[child.to] ?? 0), 0);
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
        <CountBadge count={groupPending} label={`${groupPending} pendientes`} />
        <ChevronDown
          className={clsx('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div id={panelId} className="ml-5 mt-1 space-y-1 border-l border-slate-200 pl-2">
          {group.children.map((child) => (
            <NavLeafLink key={child.to} item={child} onNavigate={onNavigate} badgeCount={badgeCounts[child.to]} />
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

  // Propuestas de productos pendientes de revisar (solo si el rol ve esa pantalla). Aprobar o rechazar
  // invalida la lista y el número se actualiza solo; el sondeo cubre las que llegan mientras tanto.
  const showsProposals = useMemo(
    () => entries.some((e) => (isNavGroup(e) ? e.children : [e]).some((c) => c.to === '/product-proposals')),
    [entries],
  );
  const { data: pendingProposals } = useListProductProposalsQuery(
    { status: 'PENDING', pageSize: 1 },
    { skip: !showsProposals, pollingInterval: 60_000 },
  );
  const badgeCounts: Record<string, number> = {
    '/product-proposals': pendingProposals?.meta.total ?? 0,
  };

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
          return <NavLeafLink key={entry.to} item={entry} onNavigate={onNavigate} badgeCount={badgeCounts[entry.to]} />;
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
            badgeCounts={badgeCounts}
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
