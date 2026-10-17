import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MergeSuggestionsAlarm } from '@/features/orders/MergeSuggestionsAlarm';
import { useActiveLocation } from '@/features/locations/LocationContext';

function PageFallback() {
  return (
    <div className="flex h-full items-center justify-center p-10 text-sm text-slate-400">
      Cargando…
    </div>
  );
}

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const { isResolved, activeLocationId } = useActiveLocation();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Hasta saber la ciudad activa no se monta nada que pida datos (evita cargar todo sin filtro).
  if (!isResolved) return <div className="h-screen bg-slate-50" />;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <MergeSuggestionsAlarm />
        {/* La key remonta las páginas al cambiar de ciudad: piden sus datos ya filtrados. */}
        <main key={activeLocationId ?? 'none'} className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
