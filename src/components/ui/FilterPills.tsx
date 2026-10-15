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
    <div className="flex gap-2 max-md:flex-nowrap max-md:gap-1 max-md:overflow-x-auto md:flex-wrap" role="group" aria-label={label}>
      {options.map((option) => {
        const on = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.id)}
            className={`${on ? 'retro-button-yellow' : 'retro-button'} shrink-0 rounded-none px-3 py-1 text-xs font-bold uppercase max-md:!border max-md:!px-2 max-md:!py-0.5 max-md:!text-[11px] max-md:!leading-4 max-md:!shadow-none`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
