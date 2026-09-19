import clsx from 'clsx';
import type { PortalRange } from './portalApi';

const TABS: { value: PortalRange; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: '6months', label: 'Semestre' },
  { value: 'year', label: 'Año' },
];

interface RangeTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  // Ofrece una pestaña extra "Todos" (sin filtro de fecha).
  includeAll?: boolean;
}

export function RangeTabs<T extends PortalRange | 'all'>({
  value,
  onChange,
  includeAll = false,
}: RangeTabsProps<T>) {
  const tabs: { value: PortalRange | 'all'; label: string }[] = includeAll
    ? [...TABS, { value: 'all', label: 'Todos' }]
    : TABS;

  return (
    <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value as T)}
          className={clsx(
            'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === tab.value ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
