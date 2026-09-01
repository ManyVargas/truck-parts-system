type TabItem<T extends string> = {
  id: T;
  label: string;
};

export type TabBarProps<T extends string> = {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
};

export function TabBar<T extends string>({ tabs, value, onChange }: TabBarProps<T>) {
  return (
    <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-navy-100 bg-navy-50 p-1" role="tablist">
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
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
