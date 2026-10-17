import Link from 'next/link';
import { FreshwaterBoard } from '@/components/fishing/FreshwaterBoard';
import { Window } from '@/components/retro/Window';
import PageWrapper from '@/components/ui/PageWrapper';
import { easternDate } from '@/lib/fishing/clock';
import { easternMonthDay, loadDailyMedians } from '@/lib/fishing/daily-stats';
import { withVerdicts } from '@/lib/fishing/flow-verdict';
import { assembleFreshwaterRows, freshwaterLayout } from '@/lib/fishing/freshwater-rows';
import {
  FRESHWATER_STATE_FILTERS,
  freshwaterHref,
  freshwaterStateCode,
  readFreshwaterState,
  readFreshwaterTab,
  type FreshwaterStateFilter,
  type FreshwaterTab,
  type OutboundLink,
} from '@/lib/fishing/freshwater-states';
import { loadFishingLakes, type FishingLake } from '@/lib/fishing/lakes';
import type { MaineStockingRow } from '@/lib/fishing/maine-stocking';
import { loadParkingAreas, type ParkingArea } from '@/lib/fishing/pfr';
import type { GaugeView } from '@/lib/fishing/readings';
import { loadActualStocking, loadMaineStocking, type ActualStocking } from '@/lib/fishing/stocking';
import { TROUT_CHECKED, TROUT_SOURCE, troutStreamStatus } from '@/lib/fishing/trout';
import { loadMountainGauges } from '@/lib/fishing/usgs';

export const dynamic = 'force-dynamic';

const TABS: { id: FreshwaterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'rivers', label: 'Rivers' },
  { id: 'lakes', label: 'Lakes & ponds' },
  { id: 'stocking', label: 'Stocking' },
];

function pillClass(on: boolean): string {
  return `${on ? 'retro-button-yellow' : 'retro-button'} shrink-0 rounded-none px-3 py-1 text-xs font-bold uppercase max-md:!border max-md:!px-2 max-md:!py-0.5 max-md:!text-[11px] max-md:!leading-4 max-md:!shadow-none`;
}

export default async function FreshwaterPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; tab?: string }>;
}) {
  const query = await searchParams;
  const state = readFreshwaterState(query.state);
  const tab = readFreshwaterTab(query.tab);
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const loaded = await loadFreshwater(state, tab, now);
  const listing = assembleFreshwaterRows(state, tab, loaded);
  const trout = troutStreamStatus(easternDate(now));
  const showTrout = (state === 'all' || state === 'ny') && (tab === 'all' || tab === 'rivers');
  const gauges = (tab === 'all' || tab === 'rivers')
    ? loaded.gauges.filter((gauge) => state === 'all' || freshwaterStateCode(gauge.state) === state)
    : [];

  return (
    <PageWrapper>
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 md:py-10">
        <div className="flex gap-2 max-md:flex-nowrap max-md:overflow-x-auto md:flex-wrap" role="group" aria-label="State">
          {FRESHWATER_STATE_FILTERS.map((item) => (
            <Link key={item.code} href={freshwaterHref(item.code, tab)} aria-current={item.code === state ? 'page' : undefined} className={pillClass(item.code === state)}>
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-2 max-md:flex-nowrap max-md:overflow-x-auto md:flex-wrap" role="group" aria-label="Freshwater">
          {TABS.map((item) => (
            <Link key={item.id} href={freshwaterHref(state, item.id)} aria-current={item.id === tab ? 'page' : undefined} className={pillClass(item.id === tab)}>
              {item.label}
            </Link>
          ))}
        </div>
        <Window title="Freshwater">
          {showTrout ? (
            <p className="mb-4 text-sm">
              <span className="font-bold">{trout.title}.</span> {trout.detail}{' '}
              <a href={TROUT_SOURCE} target="_blank" rel="noopener noreferrer" className="underline">
                Last checked {TROUT_CHECKED}
              </a>
            </p>
          ) : null}
          {loaded.stockingNote ? <p className="mb-3 text-sm">{loaded.stockingNote}</p> : null}
          {loaded.problems.map((problem) => <p key={problem} className="mb-3 text-sm font-bold">{problem}</p>)}
          <FreshwaterBoard
            rows={listing.rows}
            layout={freshwaterLayout(state, tab)}
            gauges={gauges}
            parking={loaded.parking}
            parkingError={loaded.parkingError}
            parkingTruncated={loaded.parkingTruncated}
          />
          {loaded.stockingTruncated ? <p className="mt-3 text-sm font-bold">The stocking list hit the request limit.</p> : null}
          <Outbound links={listing.sourceLinks.length > 0 ? listing.sourceLinks : listing.emptyLinks} />
        </Window>
      </div>
    </PageWrapper>
  );
}

type LoadedFreshwater = {
  gauges: GaugeView[];
  lakes: FishingLake[];
  nyStocking: ActualStocking[];
  meStocking: MaineStockingRow[];
  parking: ParkingArea[];
  parkingError: string | null;
  parkingTruncated: boolean;
  stockingNote: string | null;
  stockingTruncated: boolean;
  problems: string[];
};

async function loadFreshwater(state: FreshwaterStateFilter, tab: FreshwaterTab, now: number): Promise<LoadedFreshwater> {
  const wantRivers = tab === 'all' || tab === 'rivers';
  const wantLakes = (tab === 'all' || tab === 'lakes') && (state === 'all' || state === 'ny');
  const wantNyStock = (tab === 'all' || tab === 'stocking') && (state === 'all' || state === 'ny');
  const wantMeStock = (tab === 'all' || tab === 'stocking') && (state === 'all' || state === 'me');
  const wantParking = wantRivers && (state === 'all' || state === 'ny');
  const problems: string[] = [];

  const gauges = wantRivers ? await readOrNull(loadMountainGauges(), 'River readings are unavailable.', problems) : [];
  let medians: Record<string, number> = {};
  if (gauges && gauges.length > 0) {
    try {
      const { month, day } = easternMonthDay(now);
      const sites = gauges
        .filter((gauge) => state === 'all' || freshwaterStateCode(gauge.state) === state)
        .map((gauge) => gauge.site);
      if (sites.length > 0) medians = await loadDailyMedians(sites, month, day);
    } catch (error) {
      console.error('USGS daily medians did not load', error);
    }
  }

  const lakes = wantLakes ? await readOrNull(loadFishingLakes(), 'NY lakes are unavailable.', problems) : [];
  const nyStock = wantNyStock ? await readOrNull(loadActualStocking(), 'NY stocking is unavailable.', problems) : null;
  const maine = wantMeStock ? await readOrNull(loadMaineStocking(), 'Maine stocking is unavailable.', problems) : null;
  let parking: Awaited<ReturnType<typeof loadParkingAreas>> | null = null;
  let parkingError: string | null = null;
  if (wantParking) {
    try {
      parking = await loadParkingAreas();
    } catch (error) {
      console.error('Angler parking did not load', error);
      parkingError = 'Angler parking is unavailable.';
    }
  }

  const year = Number(easternDate(now).slice(0, 4));
  const stockingNote = nyStock
    ? `Actual stockings for ${nyStock.year}. The file has a month, not a day.${Number(nyStock.year) < year ? ' The newer season is not in this file yet.' : ''}`
    : null;

  return {
    gauges: gauges ? withVerdicts(gauges, medians) : [],
    lakes: lakes ?? [],
    nyStocking: nyStock?.rows ?? [],
    meStocking: maine?.rows ?? [],
    parking: wantParking ? parking?.areas ?? [] : [],
    parkingError,
    parkingTruncated: parking?.truncated ?? false,
    stockingNote,
    stockingTruncated: nyStock?.truncated ?? false,
    problems,
  };
}

async function readOrNull<T>(work: Promise<T>, problem: string, problems: string[]): Promise<T | null> {
  try {
    return await work;
  } catch (error) {
    console.error(problem, error);
    problems.push(problem);
    return null;
  }
}

function Outbound({ links }: { links: OutboundLink[] }) {
  if (links.length === 0) return null;
  return (
    <ul className="mt-3 space-y-2">
      {links.map((link) => (
        <li key={link.href} className="text-sm">
          <a href={link.href} target="_blank" rel="noopener noreferrer" className="font-bold underline">{link.label}</a>
          {' '}
          {link.note}
        </li>
      ))}
    </ul>
  );
}
