import Link from 'next/link';
import { SpotsTable } from '@/components/weather/SpotsTable';
import { WeatherGlanceList } from '@/components/weather/WeatherGlanceList';
import { Card } from '@/components/hub/Card';
import type { ExtremeReport } from '@/lib/weather-extremes';
import type { HubGlance } from '@/lib/mountain-weather/hub-glance';
import { formatObservationAge } from '@/lib/mountain-weather/format-display';

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
  const hasMeasured = report.spots.length > 0 && report.stats.length > 0;

  return (
    <div className="space-y-5">
      {report.partial ? (
        <p className="text-sm text-ink">
          Some summit stations did not respond ({report.failed} of {report.attempted} places). Forecast lines below are
          still from the National Weather Service grid.
        </p>
      ) : null}
      <Card title="Live extremes right now">
        <p className="text-xs text-ink-2">Measured by weather stations near each peak (airports and mesonets), not forecasts. Summit and valley stations are labeled.</p>
        {!hasMeasured ? (
          <p className="text-sm font-bold">
            {report.error ?? 'The live conditions did not load.'}
            {(report.glances?.length ?? 0) > 0 ? ' See place forecast lines below.' : ''}
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {report.stats.map((stat) => (
              <li key={stat.label}>
                <span className="font-bold">{stat.label}:</span> {stat.value}
                <span className="text-ink-2"> @ {stat.location}</span>
                {stat.stationId ? (
                  <span className="text-ink-2">
                    {' '}
                    · {stat.stationId}
                    {stat.ageMinutes != null ? ` · ${formatObservationAge(stat.ageMinutes)}` : ''}
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

      {spots.length > 0 ? (
        <Card title="Station readings near each peak">
          <SpotsTable spots={spots} />
        </Card>
      ) : null}

      {glances.length ? (
        <Card title="Forecast for each place" padded={false}>
          <p className="border-b border-hairline px-3 py-2 text-xs text-ink-2">
            The same NWS forecast each place page shows.
          </p>
          <WeatherGlanceList items={glances} />
        </Card>
      ) : null}
    </div>
  );
}