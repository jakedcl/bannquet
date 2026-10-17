import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardGrid } from '@/components/ui/DashboardGrid';
import { DashboardWindow } from '@/components/ui/DashboardWindow';
import PageWrapper from '@/components/ui/PageWrapper';
import { addCalendarDays, easternDate, formatEasternTime } from '@/lib/fishing/clock';
import { loadWater, loadWind, type WaterReading, type WindReading } from '@/lib/fishing/marine';
import { openSpecies } from '@/lib/fishing/marine-regs';
import type { GaugeView } from '@/lib/fishing/readings';
import { DEFAULT_TIDE_STATION } from '@/lib/fishing/tide-stations';
import { loadTides, nextExtreme, type TideSet } from '@/lib/fishing/tides';
import { loadMountainGauges } from '@/lib/fishing/usgs';

export const dynamic = 'force-dynamic';

const UNAVAILABLE = 'Data unavailable';

export default async function FishingPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const site = (await searchParams).site;
  if (site && /^\d+$/.test(site)) redirect(`/fishing/${site}`);

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const station = DEFAULT_TIDE_STATION;
  const begin = easternDate(now);

  let tides: TideSet | null = null;
  try {
    tides = await loadTides(station.id, begin, addCalendarDays(begin, 1));
  } catch {
    console.error('Dashboard tides did not load');
  }

  let water: WaterReading | null = null;
  try {
    water = await loadWater(station.lat, station.lon);
  } catch {
    console.error('Dashboard water temperature did not load');
  }

  let wind: WindReading | null = null;
  try {
    wind = await loadWind(station.lat, station.lon);
  } catch {
    console.error('Dashboard wind did not load');
  }

  let gauges: GaugeView[] = [];
  let gaugesUnavailable = false;
  try {
    gauges = await loadMountainGauges();
  } catch {
    console.error('Dashboard gauges did not load');
    gaugesUnavailable = true;
  }

  const next = tides ? nextExtreme(tides.extremes, now) : null;
  const rivers = gauges.filter((gauge) => gauge.flowState === 'value' && gauge.flow).slice(0, 4);
  const inSeason = openSpecies(begin).filter((row) => row.id !== 'striped-bass-hudson' && row.id !== 'blackfish-sound');

  return (
    <PageWrapper>
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <DashboardGrid>
          <DashboardWindow title="Next tide" href="/fishing/saltwater">
            <p className="text-sm font-bold">{station.label}</p>
            <p className="mt-1 text-sm">
              {next ? `${next.kind === 'H' ? 'High' : 'Low'} ${next.feet.toFixed(1)} ft at ${formatEasternTime(next.time)}` : tides ? 'No upcoming tide' : UNAVAILABLE}
            </p>
          </DashboardWindow>
          <DashboardWindow title="Water" href="/fishing/saltwater">
            <p className="text-sm font-bold">{water ? `${water.fahrenheit.toFixed(1)} °F` : UNAVAILABLE}</p>
            <p className="mt-1 text-sm">{water ? water.stationName : station.label}</p>
          </DashboardWindow>
          <DashboardWindow title="Wind" href="/fishing/saltwater">
            <p className="text-sm font-bold">{wind ? wind.text : UNAVAILABLE}</p>
            <p className="mt-1 text-sm">{wind ? wind.stationName : station.label}</p>
          </DashboardWindow>
          <DashboardWindow title="In season" href="/fishing/saltwater#in-season">
            {inSeason.length === 0 ? <p className="text-sm">Nothing open.</p> : null}
            <ul className="space-y-1">
              {inSeason.slice(0, 6).map((row) => (
                <li key={row.id} className="truncate text-sm">{row.name}</li>
              ))}
            </ul>
          </DashboardWindow>
          <DashboardWindow title="Rivers" href="/fishing/freshwater">
            {gaugesUnavailable ? <p className="text-sm font-bold">{UNAVAILABLE}</p> : null}
            {!gaugesUnavailable && rivers.length === 0 ? <p className="text-sm">No current readings.</p> : null}
            <ul className="space-y-1">
              {rivers.map((gauge) => (
                <li key={gauge.site} className="truncate text-sm">
                  <Link href={`/fishing/${gauge.site}`} className="font-bold underline">{gauge.name}</Link>
                  {' '}
                  {gauge.flow} cfs
                  {gauge.trend ? ` ${gauge.trend}` : ''}
                </li>
              ))}
            </ul>
          </DashboardWindow>
        </DashboardGrid>
      </div>
    </PageWrapper>
  );
}
