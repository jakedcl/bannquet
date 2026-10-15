import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';
import { RiversBoard } from '@/components/fishing/RiversBoard';
import { loadParkingAreas } from '@/lib/fishing/pfr';
import type { GaugeView } from '@/lib/fishing/readings';
import { loadMountainGauges } from '@/lib/fishing/usgs';
import { getWeather } from '@/lib/weather';
import type { WeatherData } from '@/types/weather';

export const dynamic = 'force-dynamic';

const UNAVAILABLE = 'Data unavailable';

export default async function FishingPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const site = (await searchParams).site ?? null;
  let gauges: GaugeView[] = [];
  let gaugesUnavailable = false;
  try {
    gauges = await loadMountainGauges();
  } catch {
    console.error('Mountain gauges did not load');
    gaugesUnavailable = true;
  }

  let parking: Awaited<ReturnType<typeof loadParkingAreas>> = { areas: [], truncated: false };
  let parkingUnavailable = false;
  try {
    parking = await loadParkingAreas();
  } catch {
    console.error('Fishing parking did not load');
    parkingUnavailable = true;
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
            Mountain rivers in the Catskills, Adirondacks, Greens, Whites, and Maine.
          </p>
          <RiversBoard
            gauges={gauges}
            gaugesUnavailable={gaugesUnavailable}
            parking={parking.areas}
            parkingError={parkingUnavailable ? UNAVAILABLE : null}
            parkingTruncated={parking.truncated}
            selected={selected?.site ?? null}
            now={now}
            forecast={forecast}
          />
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
  } catch {
    console.error('Forecast did not load');
    return (
      <div key="forecast" className="space-y-2">
        <h2 className="text-sm font-bold uppercase">{gauge.name}</h2>
        <p className="text-sm font-bold">{UNAVAILABLE}</p>
      </div>
    );
  }

  const periods = weather.forecastPeriods ?? [];
  const nws = `https://forecast.weather.gov/MapClick.php?lat=${gauge.lat}&lon=${gauge.lon}`;

  return (
    <section key="forecast" className="space-y-2 border border-border-gray bg-beige/40 px-3 py-2">
      <h2 className="text-sm font-bold uppercase">{gauge.name}</h2>
      <p className="text-sm">
        {typeof weather.temperature === 'number' ? `Air ${weather.temperature}°F` : 'Air temperature missing'}
        {weather.windSpeed ? ` · Wind ${weather.windSpeed}` : ''}
        {weather.windDirection ? ` ${weather.windDirection}` : ''}
        {typeof weather.windGust === 'number' ? ` · Gust ${Math.round(weather.windGust)} mph` : ''}
        {weather.conditions[0] ? ` · ${weather.conditions[0]}` : ''}
      </p>
      {periods.length > 0 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {periods.map((period) => (
            <li key={period.startTime} className="w-28 shrink-0 bg-white px-2 py-1 text-xs">
              <span className="block font-bold">{periodLabel(period.name)}</span>
              <span className="block">{typeof period.temperature === 'number' ? `${period.temperature}°` : '—'}</span>
              <span className="block truncate">{period.windSpeed || '—'}</span>
              <span className="block truncate text-gray-700">{period.shortForecast || '—'}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm">The forecast did not include periods.</p>
      )}
      <a href={nws} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-bold underline">
        National Weather Service forecast
      </a>
    </section>
  );
}

function periodLabel(name: string): string {
  const trimmed = name.trim();
  if (/^tonight$/i.test(trimmed)) return 'Tonight';
  if (/^this afternoon$/i.test(trimmed)) return 'Today';
  if (/^this morning$/i.test(trimmed)) return 'Morning';
  if (/^this evening$/i.test(trimmed)) return 'Evening';
  if (/^overnight$/i.test(trimmed)) return 'Overnight';
  const match = trimmed.match(/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)( Night)?$/i);
  if (!match) return trimmed;
  const short = match[1].slice(0, 3);
  const day = short.charAt(0).toUpperCase() + short.slice(1).toLowerCase();
  return match[2] ? `${day} night` : day;
}
