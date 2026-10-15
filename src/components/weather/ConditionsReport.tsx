import Link from 'next/link';
import { Table } from '@/components/retro/Table';
import { Window } from '@/components/retro/Window';
import type { ExtremeReport } from '@/lib/weather-extremes';

export function ConditionsReport({
  report,
  showForecastLink = true,
  showSpots = true,
}: {
  report: ExtremeReport;
  showForecastLink?: boolean;
  showSpots?: boolean;
}) {
  const spots = [...report.spots].sort((a, b) => a.mountain.localeCompare(b.mountain));

  return (
    <div className="space-y-6">
      <Window title="Live conditions">
        <p className="mb-4 text-sm text-gray-700">
          The same National Weather Service readings as the banner on the home page.
          Low and high cover the next day, along with the temperature right now.
        </p>
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

      {showSpots ? <Window title="Spots">
        {spots.length === 0 ? (
          <p className="text-sm">No spots came back.</p>
        ) : (
          <Table
            headers={['Spot', 'Now', 'Low', 'High', 'Wind', 'Wind chill', 'Snow']}
            rows={spots.map((spot) => [
              `${spot.mountain}, ${spot.state}`,
              `${spot.temperature}°F`,
              `${spot.minTemperature}°F`,
              `${spot.maxTemperature}°F`,
              `${spot.windSpeed} mph`,
              `${spot.windChill}°F`,
              spot.isSnowing ? 'Yes' : 'No',
            ])}
          />
        )}
      </Window> : null}
    </div>
  );
}
