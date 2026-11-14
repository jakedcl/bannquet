import Link from 'next/link';
import { SpotsTable } from '@/components/weather/SpotsTable';
import { WeatherGlanceList } from '@/components/weather/WeatherGlanceList';
import { Card } from '@/components/hub/Card';
import type { ExtremeReport } from '@/lib/weather-extremes';
import type { HubGlance } from '@/lib/mountain-weather/hub-glance';

export function ConditionsReport({
  report,
  glances = [],
  showForecastLink = true,
}: {
  report: ExtremeReport;
  glances?: HubGlance[];
  showForecastLink?: boolean;
}) {
  const spots = [...report.spots].sort((a, b) => a.mountain.localeCompare(b.mountain));

  return (
    <div className="space-y-5">
      <Card title="Live measured extremes">
        <p className="text-xs text-gray-700">From bound NWS/ASOS stations (M10 bindings) — not forecasts.</p>
        {!report.success || report.stats.length === 0 ? (
          <p className="text-sm font-bold">The live conditions did not load.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {report.stats.map((stat) => (
              <li key={stat.label}>
                <span className="font-bold">{stat.label}:</span> {stat.value}
                <span className="text-gray-600"> @ {stat.location}</span>
                {stat.stationId ? (
                  <span className="text-gray-600">
                    {' '}
                    · {stat.stationId}
                    {stat.ageMinutes != null ? ` · ${stat.ageMinutes} min ago` : ''}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {showForecastLink ? (
          <p className="mt-4 text-sm">
            <Link href="/mountain-weather" className="font-bold underline">
              Mountain weather
            </Link>{' '}
            has full pages per place.
          </p>
        ) : null}
      </Card>

      <Card title="Measured spots">
        <SpotsTable spots={spots} />
      </Card>

      {glances.length ? (
        <Card title="Place forecast lines" padded={false}>
          <p className="border-b border-[#5c3a1e]/20 px-3 py-2 text-xs text-gray-700">Same cached NWS baseline reader as place pages.</p>
          <WeatherGlanceList items={glances} />
        </Card>
      ) : null}
    </div>
  );
}