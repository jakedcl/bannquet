import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';
import { RiversBoard } from '@/components/fishing/RiversBoard';
import { loadParkingAreas } from '@/lib/fishing/pfr';
import type { GaugeView } from '@/lib/fishing/readings';
import { loadMountainGauges } from '@/lib/fishing/usgs';
import { getWeather } from '@/lib/weather';
import type { WeatherData } from '@/types/weather';

export const dynamic = 'force-dynamic';

function message(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default async function FishingPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const site = (await searchParams).site ?? null;
  let gauges: GaugeView[] = [];
  let gaugesError: string | null = null;
  try {
    gauges = await loadMountainGauges();
  } catch (error) {
    gaugesError = message(error, 'The USGS gauges did not load.');
  }

  let parking: Awaited<ReturnType<typeof loadParkingAreas>> = { areas: [], truncated: false };
  let parkingError: string | null = null;
  try {
    parking = await loadParkingAreas();
  } catch (error) {
    parkingError = message(error, 'NY public fishing rights parking did not load.');
  }

  const selected = gauges.find((gauge) => gauge.site === site) ?? null;
  const forecast = await forecastPanel(site, selected);
  // Server clock so the age labels in the HTML match the client.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <PageWrapper>
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
        <Window title="Mountain fishing">
          <p className="mb-4 text-sm text-gray-700">
            A curated set of USGS gauges in the Catskills, Adirondacks, Green Mountains, White Mountains, and Maine.
            Flow and gauge height are shown when that gauge reports them. Water temperature is shown only when the gauge measures it.
            The 24-hour figure is the change in flow on the same series, compared with a reading about a day earlier.
            Readings older than 48 hours are left blank. Live USGS values are usually provisional.
          </p>
          {gaugesError ? (
            <p className="text-sm font-bold">{gaugesError}</p>
          ) : (
            <RiversBoard
              gauges={gauges}
              parking={parking.areas}
              parkingError={parkingError}
              parkingTruncated={parking.truncated}
              selected={selected?.site ?? null}
              now={now}
              forecast={forecast}
            />
          )}
        </Window>
      </div>
    </PageWrapper>
  );
}

async function forecastPanel(site: string | null, gauge: GaugeView | null) {
  if (!site) return null;
  if (!gauge) {
    return <p key="forecast" className="text-sm font-bold">That gauge is not in this list.</p>;
  }
  if (gauge.lat == null || gauge.lon == null) {
    return (
      <p key="forecast" className="text-sm font-bold">
        {gauge.name} has no coordinates from USGS, so there is no forecast point.
      </p>
    );
  }

  let weather: WeatherData;
  try {
    weather = await getWeather(gauge.lat, gauge.lon);
  } catch (error) {
    return (
      <div key="forecast" className="space-y-2">
        <h2 className="text-sm font-bold uppercase">{gauge.name}</h2>
        <p className="text-sm font-bold">{message(error, 'The National Weather Service forecast did not load.')}</p>
      </div>
    );
  }

  const hourly = (weather.hourlyForecast ?? []).slice(0, 6);
  const nws = `https://forecast.weather.gov/MapClick.php?lat=${gauge.lat}&lon=${gauge.lon}`;

  return (
    <section key="forecast" className="space-y-2 border border-border-gray bg-beige/40 p-3">
      <h2 className="text-sm font-bold uppercase">{gauge.name}</h2>
      <p className="text-sm">
        {typeof weather.temperature === 'number' ? `Air ${weather.temperature}°F` : 'Air temperature missing'}
        {weather.windSpeed ? ` · Wind ${weather.windSpeed}` : ''}
        {weather.windDirection ? ` ${weather.windDirection}` : ''}
        {typeof weather.windGust === 'number' ? ` · Gust ${Math.round(weather.windGust)} mph` : ''}
      </p>
      {weather.conditions[0] ? <p className="text-sm text-gray-700">{weather.conditions[0]}</p> : null}
      {hourly.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {hourly.map((period) => (
            <li key={period.startTime} className="bg-white p-2 text-sm retro-box-inset">
              <span className="block font-bold">{period.name}</span>
              <span className="block">{typeof period.temperature === 'number' ? `${period.temperature}°F` : ''}</span>
              {period.windSpeed ? <span className="block">{period.windSpeed}</span> : null}
              {period.shortForecast ? <span className="block text-gray-700">{period.shortForecast}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm">The forecast did not include hourly periods.</p>
      )}
      <a href={nws} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-bold underline">
        National Weather Service forecast
      </a>
    </section>
  );
}
