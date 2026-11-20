import { WindArrow } from '@/components/mountain-weather/kit';
import type { BaselineForecast } from '@/lib/mountain-weather/baseline-forecast';
import type { MountainPlace } from '@/lib/mountain-weather/places';
import type { SourceResult } from '@/lib/mountain-weather/source-types';

function timeEt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
}

/**
 * Place header (Wx-Place boards): green band with rounded bottom, eyebrow,
 * name, and the forecast for right now, clearly labeled as a forecast for
 * the map point and not a measured reading.
 */
export function PlaceHero({
  place,
  eyebrow,
  baseline,
}: {
  place: MountainPlace;
  eyebrow: string;
  baseline: SourceResult<BaselineForecast>;
}) {
  const now = baseline.data;
  const temp = now?.temperature != null ? Math.round(now.temperature) : null;
  const at = timeEt(now?.timestamp);
  return (
    <header className="page-hero relative overflow-hidden rounded-b-hero squircle">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 [background-image:var(--texture-scanlines)]" />
      <div className="relative mx-auto max-w-3xl px-4 pb-6 pt-4">
        <p className="eyebrow text-yellow">{eyebrow}</p>
        <h1 className="page-hero-title mt-0.5">{place.name}</h1>
        {now ? (
          <>
            <div className="mt-2 flex items-center gap-4">
              <p className="text-display font-bold tabular-nums [text-shadow:2px_2px_4px_rgba(0,0,0,0.5)]">
                {temp !== null ? `${temp}°` : '—'}
              </p>
              <div className="min-w-0 text-meta">
                {now.feelsLike != null ? <p>Feels like {Math.round(now.feelsLike)}°</p> : null}
                <p className="flex items-center gap-1">
                  <WindArrow from={now.windDirection} className="h-3.5 w-3.5 !text-yellow" />
                  {[now.windDirection, now.windSpeed].filter(Boolean).join(' ') || 'Wind —'}
                  {now.windGust != null ? ` · gusts to ${Math.round(now.windGust)} mph` : ''}
                </p>
                {now.conditions[0] ? <p>{now.conditions[0]}</p> : null}
                {temp !== null && temp <= 32 ? <p className="font-bold text-yellow">Below freezing</p> : null}
              </div>
            </div>
            <p className="mt-2 text-caption text-on-dark/85">
              NWS forecast for this map point{at ? ` · ${at} ET` : ''} · not a measured reading
            </p>
          </>
        ) : (
          <p className="mt-2 text-caption text-on-dark/85">The NWS forecast did not load. The tabs below still show what did.</p>
        )}
      </div>
    </header>
  );
}
