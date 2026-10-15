import Link from 'next/link';
import { SpotsTable } from '@/components/weather/SpotsTable';
import { Window } from '@/components/retro/Window';
import type { ExtremeReport } from '@/lib/weather-extremes';

export function ConditionsReport({
  report,
  showForecastLink = true,
}: {
  report: ExtremeReport;
  showForecastLink?: boolean;
}) {
  const spots = [...report.spots].sort((a, b) => a.mountain.localeCompare(b.mountain));

  return (
    <div className="space-y-6">
      <Window title="Live conditions">
        {!report.success || report.stats.length === 0 ? (
          <p className="text-sm font-bold">The live conditions did not load.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {report.stats.map((stat) => (
              <li key={stat.label}>
                <span className="font-bold">{stat.label}:</span> {stat.value}
                <span className="text-gray-600"> @ {stat.location}</span>
              </li>
            ))}
          </ul>
        )}
        {showForecastLink ? (
          <p className="mt-4 text-sm">
            <Link href="/mountain-weather" className="underline">Mountain weather</Link>
            {' '}has the forecast for each region.
          </p>
        ) : null}
      </Window>

      <Window title="Spots">
        <SpotsTable spots={spots} />
      </Window>
    </div>
  );
}
