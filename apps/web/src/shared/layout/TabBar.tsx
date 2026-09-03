type TabItem<T extends string> = {
  id: T;
  label: string;
};

export type TabBarProps<T extends string> = {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  'aria-label'?: string;
};

/**
 * Exclusive filters for a single list. Not a tablist: there are no panels,
 * only which rows are shown. Use `Tabs` when switching distinct content.
 */
export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  'aria-label': ariaLabel = 'Filtros',
}: TabBarProps<T>) {
  return (
    <div
      className="mb-6 flex flex-wrap gap-1 rounded-xl border border-navy-100 bg-navy-50 p-1"
      role="group"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={selected}
            className={`min-h-11 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light/50 ${
              selected ? 'bg-white text-navy shadow-sm' : 'text-navy-400 hover:text-navy'
            }`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
