'use client';

export function RetroSwitch({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex min-h-11 items-center gap-2 text-xs font-bold uppercase text-[#1a1a1a]">
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
        className={`retro-switch ${checked ? 'retro-switch-on' : ''} ${disabled ? 'retro-switch-locked' : ''}`}
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
      <span className="select-none text-[10px] font-bold normal-case text-[#5c3a1e]" aria-hidden="true">
        {checked ? 'On' : 'Off'}
      </span>
    </div>
  );
}
