import { SaltwaterConditions } from '@/components/fishing/SaltwaterConditions';
import { FishingRows } from '@/components/fishing/FishingRows';
import { Window } from '@/components/retro/Window';
import PageWrapper from '@/components/ui/PageWrapper';
import { ADVISORIES, ADVISORIES_CHECKED, ADVISORIES_SOURCE, waterBody } from '@/lib/fishing/advisories';
import { addCalendarDays, easternDate } from '@/lib/fishing/clock';
import { loadMarine, loadWater, loadWind, type MarineForecast, type WaterReading, type WindReading } from '@/lib/fishing/marine';
import { MARINE_REGS_CHECKED, MARINE_REGS_SOURCE, regulationsToday } from '@/lib/fishing/marine-regs';
import { nearestTideStation, SHORE_SPOTS } from '@/lib/fishing/shore-spots';
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
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 md:py-10">
        <SaltwaterConditions
          station={station}
          tides={tides}
          water={water}
          wind={wind}
          marine={marine}
          sky={skyFor(station.lat, station.lon, now)}
          now={now}
        />
        <Window title="In season now">
          <div id="in-season">
            <FishingRows
              rows={regulationsToday(now).map((row) => ({
                id: row.id,
                name: row.name,
                detail: row.status,
                extra: `${row.size} · ${row.bag}`,
              }))}
              headers={{ name: 'Species', detail: 'Status', extra: 'Size and bag' }}
              empty="No regulations listed."
            />
            <p className="mt-3 text-xs">
              NY Bight limits, including Staten Island.{' '}
              <a href={MARINE_REGS_SOURCE} target="_blank" rel="noopener noreferrer" className="underline">
                Last checked {MARINE_REGS_CHECKED}
              </a>
            </p>
          </div>
        </Window>
        <Window title="Eat safe">
          <FishingRows
            rows={ADVISORIES.map((row) => ({
              id: row.id,
              name: waterBody(row.waterId)?.name ?? row.waterId,
              detail: row.fish,
              extra: `${row.general} / ${row.sensitive}`,
            }))}
            headers={{ name: 'Water', detail: 'Fish', extra: 'General / sensitive' }}
            empty="No advisories listed."
          />
          <p className="mt-3 text-xs">
            Do not eat crab or lobster tomalley.{' '}
            <a href={ADVISORIES_SOURCE} target="_blank" rel="noopener noreferrer" className="underline">
              Last checked {ADVISORIES_CHECKED}
            </a>
          </p>
        </Window>
        <Window title="Staten Island shore">
          <FishingRows
            rows={SHORE_SPOTS.map((spot) => ({
              id: spot.slug,
              name: spot.name,
              detail: nearestTideStation(spot).label,
              extra: spot.access,
              href: `/fishing/saltwater/${spot.slug}`,
            }))}
            headers={{ name: 'Spot', detail: 'Tide station', extra: 'Access' }}
            empty="No shore spots listed."
          />
        </Window>
      </div>
    </PageWrapper>
  );
}
