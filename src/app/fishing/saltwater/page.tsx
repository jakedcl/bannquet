import { SaltwaterConditions } from '@/components/fishing/SaltwaterConditions';
import PageWrapper from '@/components/ui/PageWrapper';
import { addCalendarDays, easternDate } from '@/lib/fishing/clock';
import { loadMarine, loadWater, loadWind, type MarineForecast, type WaterReading, type WindReading } from '@/lib/fishing/marine';
import { skyFor } from '@/lib/fishing/sky';
import { tideStation } from '@/lib/fishing/tide-stations';
import { loadTides, type TideSet } from '@/lib/fishing/tides';

export const dynamic = 'force-dynamic';

export default async function SaltwaterPage({
  searchParams,
}: {
  searchParams: Promise<{ station?: string }>;
}) {
  const station = tideStation((await searchParams).station);
  // Server clock so tide "next" and the solunar day match the rendered HTML.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const begin = easternDate(now);
  const end = addCalendarDays(begin, 3);

  let tides: TideSet | null = null;
  try {
    tides = await loadTides(station.id, begin, end);
  } catch {
    console.error('Tide predictions did not load', station.id);
  }

  let water: WaterReading | null = null;
  try {
    water = await loadWater(station.lat, station.lon);
  } catch {
    console.error('Water temperature did not load', station.id);
  }

  let wind: WindReading | null = null;
  try {
    wind = await loadWind(station.lat, station.lon);
  } catch {
    console.error('Wind did not load', station.id);
  }

  let marine: MarineForecast | null = null;
  try {
    marine = await loadMarine(station.lat, station.lon);
  } catch {
    console.error('Marine forecast did not load', station.id);
  }

  return (
    <PageWrapper>
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <SaltwaterConditions
          station={station}
          tides={tides}
          water={water}
          wind={wind}
          marine={marine}
          sky={skyFor(station.lat, station.lon, now)}
          now={now}
        />
      </div>
    </PageWrapper>
  );
}
