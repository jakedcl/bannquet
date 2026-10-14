import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { Table } from '@/components/retro/Table';
import { Window } from '@/components/retro/Window';
import { loadWeatherExtremes } from '@/lib/weather-extremes';

export const dynamic = 'force-dynamic';

export default async function ConditionsPage() {
  const report = await loadWeatherExtremes();
  const spots = [...report.spots].sort((a, b) => a.mountain.localeCompare(b.mountain));

  return (
    <PageWrapper>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
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
          <p className="mt-4 text-sm">
            <Link href="/mountain-weather" className="underline">Mountain weather</Link>
            {' '}has the forecast for each region.
          </p>
        </Window>

        <Window title="Spots">
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
        </Window>
      </div>
    </PageWrapper>
  );
}
