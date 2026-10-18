import type { ForecastSnippet } from '@/types/weather';

function periodLabel(period: ForecastSnippet): string {
  const name = period.name?.trim() ?? '';
  if (name && name !== 'This Afternoon' && name !== 'Overnight') return name;
  return new Date(period.startTime).toLocaleTimeString([], { hour: 'numeric' });
}

export function ForecastStrip({
  label,
  items,
  variant = 'hourly',
}: {
  label: string;
  items: ForecastSnippet[];
  variant?: 'hourly' | 'daily' | 'text';
}) {
  if (items.length === 0) return null;

  return (
    <section className="min-w-0 max-w-full space-y-2 border border-border-gray bg-beige/40 px-3 py-2">
      <h3 className="text-sm font-bold uppercase">{label}</h3>
      <ul className="flex w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-1">
        {items.map((period) => (
          <li
            key={`${period.startTime}-${label}`}
            className={`${variant === 'text' ? 'w-44' : 'w-28'} shrink-0 bg-white px-2 py-1 text-xs`}
          >
            <span className="block font-bold">
              {variant === 'hourly' ? periodLabel(period) : period.name}
            </span>
            {variant === 'daily' && period.secondaryTemp !== undefined ? (
              <>
                <span className="block">{period.temperature}° hi</span>
                <span className="block">{period.secondaryTemp}° lo</span>
              </>
            ) : null}
            {variant === 'daily' && period.secondaryTemp === undefined ? <span className="block">{period.temperature}°</span> : null}
            {variant === 'hourly' ? <span className="block">{period.temperature}°</span> : null}
            {variant === 'text' ? null : <span className="block truncate">{period.windSpeed || '—'}</span>}
            <span className={variant === 'text' ? 'block line-clamp-4' : 'block truncate'}>
              {period.shortForecast || '—'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
