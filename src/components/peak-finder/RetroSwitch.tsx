'use client';

export function RetroSwitch({
  label,
  checked,
  disabled,
  compact,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  compact?: boolean;
  onChange: (next: boolean) => void;
}) {
  const shell = compact
    ? 'flex min-h-8 shrink-0 items-center gap-1 text-[10px] font-bold uppercase text-[#1a1a1a]'
    : 'flex min-h-11 items-center gap-2 text-xs font-bold uppercase text-[#1a1a1a]';
  return (
    <div className={shell}>
      <span id={`${label}-switch-label`} className="select-none">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${label}-switch-label`}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        data-pf-control
        className={`peak-finder-control retro-switch ${compact ? 'retro-switch-compact' : ''} ${checked ? 'retro-switch-on' : ''} ${disabled ? 'retro-switch-locked' : ''}`}
      >
        <span className="retro-switch-track" aria-hidden="true">
          <span className="retro-switch-thumb" />
        </span>
        <span className="sr-only">
          {label}
          {' '}
          {checked ? 'on' : 'off'}
        </span>
      </button>
      <span className={`select-none font-bold normal-case text-[#5c3a1e] ${compact ? 'text-[9px]' : 'text-[10px]'}`} aria-hidden="true">
        {checked ? 'On' : 'Off'}
      </span>
    </div>
  );
}
