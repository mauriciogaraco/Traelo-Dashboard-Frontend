interface ModulePlaceholderProps {
  title: string;
  description?: string;
}

export function ModulePlaceholder({ title, description }: ModulePlaceholderProps) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-8">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      <p className="text-sm text-slate-500">
        {description ?? 'Este módulo se construye en el siguiente paso del checklist.'}
      </p>
    </div>
  );
}
