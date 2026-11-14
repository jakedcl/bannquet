import Link from 'next/link';
import { Card } from '@/components/hub/Card';
import { WeatherGlanceList } from '@/components/weather/WeatherGlanceList';
import type { StateGlance } from '@/lib/weather-hub';

export function WeatherHub({ states }: { states: StateGlance[] }) {
  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      {states.map((state) => (
        <Card
          key={state.code}
          title={state.name}
          titleHref={state.href}
          action={<Link href={state.href} className="-my-2 inline-flex min-h-11 items-center text-sm text-[#ffd700] no-underline">Forecasts ›</Link>}
          padded={false}
        >
          <WeatherGlanceList items={state.regions} />
        </Card>
      ))}
    </div>
  );
}
