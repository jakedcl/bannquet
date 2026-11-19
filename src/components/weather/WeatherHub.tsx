import Link from 'next/link';
import { Card } from '@/components/hub/Card';
import { WeatherGlanceList } from '@/components/weather/WeatherGlanceList';
import type { StateGlance } from '@/lib/weather-hub';

/** One panel per state: its sections' forecast rows, with section and place counts. */
export function WeatherHub({ states, counts }: { states: StateGlance[]; counts: Record<string, { sections: number; places: number }> }) {
  return (
    <div className="grid min-w-0 gap-4">
      {states.map((state) => {
        const count = counts[state.code];
        return (
          <Card
            key={state.code}
            title={state.name}
            titleHref={state.href}
            action={<Link href={state.href} className="-my-2 inline-flex min-h-11 items-center no-underline">Forecasts ›</Link>}
            padded={false}
          >
            {count ? (
              <p className="border-b border-hairline bg-surface-cream px-3.5 py-1.5 text-caption text-ink-2">
                {count.sections} sections · {count.places} places
              </p>
            ) : null}
            <WeatherGlanceList items={state.regions} />
          </Card>
        );
      })}
    </div>
  );
}
