type IconProps = { className?: string };

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function ChevronIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 10 16" className={className} {...base} strokeWidth={2.2}>
      <path d="M2 2l6 6-6 6" />
    </svg>
  );
}

export function BackIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 10 16" className={className} {...base} strokeWidth={2.4}>
      <path d="M8 2L2 8l6 6" />
    </svg>
  );
}

export function MapIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

export function TripsIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M3 19l6.5-11 3.5 6 2-3 6 8H3z" />
      <circle cx="16.5" cy="6" r="1.8" />
    </svg>
  );
}

export function UploadIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export function WeatherIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M7.5 18.5h9a4 4 0 00.4-7.98A5.5 5.5 0 006.3 11.6 3.5 3.5 0 007.5 18.5z" />
    </svg>
  );
}

export function ProfileIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20c1.3-3.6 4.2-5.5 7.5-5.5s6.2 1.9 7.5 5.5" />
    </svg>
  );
}

export function MoreIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <circle cx="5.5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="18.5" cy="12" r="1.7" />
    </svg>
  );
}

export function CloseIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} {...base} strokeWidth={2.2}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function LayersIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
    </svg>
  );
}
