import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import clsx from 'clsx';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  error?: string;
  allowClear?: boolean;
  disabled?: boolean;
}

export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Buscar…',
  error,
  allowClear = true,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={clsx(
            'flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
            error && 'border-red-400',
            disabled && 'cursor-not-allowed bg-slate-50 text-slate-400',
          )}
        >
          <span className={selected ? 'text-slate-900' : 'text-slate-400'}>
            {selected ? selected.label : placeholder}
          </span>
          <span className="flex items-center gap-1">
            {allowClear && selected && !disabled && (
              <X
                className="h-4 w-4 text-slate-400 hover:text-slate-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              />
            )}
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </span>
        </button>

        {open && !disabled && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full border-b border-slate-100 px-3 py-2 text-sm focus:outline-none"
            />
            <ul className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-slate-400">Sin resultados.</li>
              )}
              {filtered.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                      setQuery('');
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span>
                      {option.label}
                      {option.sublabel && (
                        <span className="ml-1.5 text-xs text-slate-400">{option.sublabel}</span>
                      )}
                    </span>
                    {option.value === value && <Check className="h-4 w-4 text-brand-600" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
