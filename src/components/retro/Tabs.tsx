'use client';

type Tab = {
  id: string;
  label: string;
};

type TabsProps = {
  tabs: Tab[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
};

export function Tabs({ tabs, value, onChange, label = 'Sections' }: TabsProps) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label={label}>
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={
              selected
                ? 'retro-button retro-button-yellow rounded-none px-4 py-2 text-sm font-bold uppercase'
                : 'retro-button rounded-none px-4 py-2 text-sm font-bold uppercase text-gray-800'
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
