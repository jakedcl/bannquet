'use client';

type TooltipProps = {
  label: string;
  children: React.ReactNode;
};

export function Tooltip({ label, children }: TooltipProps) {
  return (
    <span className="relative inline-flex group">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-64 -translate-x-1/2 border-2 border-brand-green-dark bg-accent-yellow p-2 text-left text-xs font-bold normal-case tracking-normal text-brand-green-dark shadow-retro group-hover:block group-focus-within:block"
      >
        {label}
      </span>
    </span>
  );
}
