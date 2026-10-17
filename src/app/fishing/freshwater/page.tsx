import Link from 'next/link';
import { LakesBoard } from '@/components/fishing/LakesBoard';
import { RiversBoard } from '@/components/fishing/RiversBoard';
import { StockingBoard, type StockRow } from '@/components/fishing/StockingBoard';
import { Window } from '@/components/retro/Window';
import PageWrapper from '@/components/ui/PageWrapper';
import { easternDate } from '@/lib/fishing/clock';
import { easternMonthDay, loadDailyMedians } from '@/lib/fishing/daily-stats';
import { withVerdicts } from '@/lib/fishing/flow-verdict';
import {
  FRESHWATER_STATES,
  freshwaterHref,
  freshwaterStateCode,
  LAKE_LINKS,
  readFreshwaterState,
  readFreshwaterTab,
  STOCKING_LINKS,
  type FreshwaterState,
  type FreshwaterTab,
} from '@/lib/fishing/freshwater-states';
import { loadFishingLakes, type FishingLake } from '@/lib/fishing/lakes';
import { loadParkingAreas } from '@/lib/fishing/pfr';
import type { GaugeView } from '@/lib/fishing/readings';
import { loadActualStocking, loadMaineStocking, type ActualStockingLoad } from '@/lib/fishing/stocking';
import { TROUT_CHECKED, TROUT_SOURCE, troutStreamStatus } from '@/lib/fishing/trout';
import { loadMountainGauges } from '@/lib/fishing/usgs';
import type { MaineStockingReport } from '@/lib/fishing/maine-stocking';

export const dynamic = 'force-dynamic';

const UNAVAILABLE = 'Data unavailable';
const TABS: { id: FreshwaterTab; label: string }[] = [
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

  return (
    <PageWrapper>
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 md:py-10">
        <div className="flex gap-2 max-md:flex-nowrap max-md:overflow-x-auto md:flex-wrap" role="group" aria-label="State">
          {FRESHWATER_STATES.map((item) => (
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
        {tab === 'rivers' ? <RiversTab state={state} now={now} /> : null}
        {tab === 'lakes' ? <LakesTab state={state} /> : null}
        {tab === 'stocking' ? <StockingTab state={state} year={Number(easternDate(now).slice(0, 4))} /> : null}
      </div>
    </PageWrapper>
  );
}

async function RiversTab({ state, now }: { state: FreshwaterState; now: number }) {
  let gauges: GaugeView[] = [];
  let gaugesUnavailable = false;
  try {
    gauges = await loadMountainGauges();
  } catch {
    console.error('Mountain gauges did not load');
    gaugesUnavailable = true;
  }
  const rows = gauges.filter((gauge) => freshwaterStateCode(gauge.state) === state);

  let medians: Record<string, number> = {};
  if (rows.length > 0) {
    try {
      const { month, day } = easternMonthDay(now);
      medians = await loadDailyMedians(rows.map((gauge) => gauge.site), month, day);
    } catch {
      console.error('USGS daily medians did not load');
    }
  }

  let parking: Awaited<ReturnType<typeof loadParkingAreas>> = { areas: [], truncated: false };
  let parkingUnavailable = false;
  if (state === 'ny') {
    try {
      parking = await loadParkingAreas();
    } catch {
      console.error('Fishing parking did not load');
      parkingUnavailable = true;
    }
  }

  const trout = troutStreamStatus(easternDate(now));

  return (
    <Window title="Rivers">
      {state === 'ny' ? (
        <p className="mb-4 text-sm">
          <span className="font-bold">{trout.title}.</span> {trout.detail}{' '}
          <a href={TROUT_SOURCE} target="_blank" rel="noopener noreferrer" className="underline">
            Last checked {TROUT_CHECKED}
          </a>
        </p>
      ) : null}
      <RiversBoard
        gauges={withVerdicts(rows, medians)}
        gaugesUnavailable={gaugesUnavailable}
        parking={state === 'ny' ? parking.areas : []}
        parkingError={parkingUnavailable ? UNAVAILABLE : null}
        parkingTruncated={parking.truncated}
      />
    </Window>
  );
}

async function LakesTab({ state }: { state: FreshwaterState }) {
  if (state !== 'ny') {
    return (
      <Window title="Lakes and ponds">
        <Outbound links={LAKE_LINKS[state] ?? []} />
      </Window>
    );
  }
  let lakes: FishingLake[] = [];
  let unavailable = false;
  try {
    lakes = await loadFishingLakes();
  } catch {
    console.error('NY fishing lakes did not load');
    unavailable = true;
  }
  return (
    <Window title="Lakes and ponds">
      {unavailable ? <p className="text-sm font-bold">{UNAVAILABLE}</p> : <LakesBoard lakes={lakes} />}
    </Window>
  );
}

async function StockingTab({ state, year }: { state: FreshwaterState; year: number }) {
  const links = STOCKING_LINKS[state] ?? [];
  if (state === 'ny') {
    let load: ActualStockingLoad | null = null;
    let unavailable = false;
    try {
      load = await loadActualStocking();
    } catch {
      console.error('NY actual stocking did not load');
      unavailable = true;
    }
    const rows: StockRow[] = (load?.rows ?? []).map((row) => ({
      id: row.id,
      water: row.waterbody,
      when: row.when,
      species: row.species ?? '',
      number: row.number ?? '',
      place: [row.town, row.county].filter(Boolean).join(', '),
    }));
    return (
      <Window title="Stocking">
        <p className="mb-3 text-sm">
          {load ? `Actual stockings for ${load.year}. The file has a month, not a day.` : null}
          {load && Number(load.year) < year ? ' The newer season is not in this file yet.' : null}
        </p>
        {unavailable ? <p className="text-sm font-bold">{UNAVAILABLE}</p> : <StockingBoard rows={rows} />}
        {load?.truncated ? <p className="mt-3 text-sm font-bold">The list hit the request limit.</p> : null}
        <Outbound links={links} />
      </Window>
    );
  }

  if (state === 'me') {
    let report: MaineStockingReport | null = null;
    let unavailable = false;
    try {
      report = await loadMaineStocking();
    } catch {
      console.error('Maine stocking did not load');
      unavailable = true;
    }
    const rows: StockRow[] = (report?.rows ?? []).map((row, index) => ({
      id: `${row.date}-${row.water}-${index}`,
      water: row.water,
      when: row.date,
      species: row.species,
      number: row.quantity,
      place: [row.town, row.county].filter(Boolean).join(', '),
    }));
    return (
      <Window title="Stocking">
        {unavailable ? <p className="mb-3 text-sm font-bold">{UNAVAILABLE}</p> : <StockingBoard rows={rows} />}
        <Outbound links={links} />
      </Window>
    );
  }

  return (
    <Window title="Stocking">
      <Outbound links={links} />
    </Window>
  );
}

function Outbound({ links }: { links: { href: string; label: string; note: string }[] }) {
  if (links.length === 0) return <p className="text-sm">No free list for this state.</p>;
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
