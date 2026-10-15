'use client';

export function FilterPills({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ id: string; label: string }>;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((option) => {
        const on = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.id)}
            className={`${on ? 'retro-button-yellow' : 'retro-button'} rounded-none px-3 py-1 text-xs font-bold uppercase`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
