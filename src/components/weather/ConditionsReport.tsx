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
      <Card title="Live measured extremes">
        <p className="text-xs text-ink-2">From ASOS and mesonet stations bound to each peak — not forecasts.</p>
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
        <Card title="Measured spots">
          <SpotsTable spots={spots} />
        </Card>
      ) : null}

      {glances.length ? (
        <Card title="Place forecast lines" padded={false}>
          <p className="border-b border-hairline px-3 py-2 text-xs text-ink-2">
            Same NWS grid forecast shown on each place page (updated on the same schedule).
          </p>
          <WeatherGlanceList items={glances} />
        </Card>
      ) : null}
    </div>
  );
}