import { LakesBoard } from '@/components/fishing/LakesBoard';
import { RiversBoard } from '@/components/fishing/RiversBoard';
import { Window } from '@/components/retro/Window';
import PageWrapper from '@/components/ui/PageWrapper';
import { easternDate } from '@/lib/fishing/clock';
import { easternMonthDay, loadDailyMedians } from '@/lib/fishing/daily-stats';
import { withVerdicts } from '@/lib/fishing/flow-verdict';
import { loadFishingLakes, type FishingLake } from '@/lib/fishing/lakes';
import { loadParkingAreas } from '@/lib/fishing/pfr';
import type { GaugeView } from '@/lib/fishing/readings';
import { TROUT_CHECKED, TROUT_SOURCE, troutStreamStatus } from '@/lib/fishing/trout';
import { loadMountainGauges } from '@/lib/fishing/usgs';

export const dynamic = 'force-dynamic';

const UNAVAILABLE = 'Data unavailable';

export default async function FreshwaterPage() {
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  let gauges: GaugeView[] = [];
  let gaugesUnavailable = false;
  try {
    gauges = await loadMountainGauges();
  } catch {
    console.error('Mountain gauges did not load');
    gaugesUnavailable = true;
  }

  let medians: Record<string, number> = {};
  if (gauges.length > 0) {
    try {
      const { month, day } = easternMonthDay(now);
      medians = await loadDailyMedians(gauges.map((gauge) => gauge.site), month, day);
    } catch {
      console.error('USGS daily medians did not load');
    }
  }

  let parking: Awaited<ReturnType<typeof loadParkingAreas>> = { areas: [], truncated: false };
  let parkingUnavailable = false;
  try {
    parking = await loadParkingAreas();
  } catch {
    console.error('Fishing parking did not load');
    parkingUnavailable = true;
  }

  let lakes: FishingLake[] = [];
  let lakesUnavailable = false;
  try {
    lakes = await loadFishingLakes();
  } catch {
    console.error('NY fishing lakes did not load');
    lakesUnavailable = true;
  }

  const trout = troutStreamStatus(easternDate(now));

  return (
    <PageWrapper>
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 md:py-10">
        <Window title="Rivers">
          <p className="mb-4 text-sm">
            <span className="font-bold">{trout.title}.</span> {trout.detail}{' '}
            <a href={TROUT_SOURCE} target="_blank" rel="noopener noreferrer" className="underline">
              Last checked {TROUT_CHECKED}
            </a>
          </p>
          <RiversBoard
            gauges={withVerdicts(gauges, medians)}
            gaugesUnavailable={gaugesUnavailable}
            parking={parking.areas}
            parkingError={parkingUnavailable ? UNAVAILABLE : null}
            parkingTruncated={parking.truncated}
          />
        </Window>
        <Window title="Lakes and ponds">
          {lakesUnavailable ? <p className="text-sm font-bold">{UNAVAILABLE}</p> : <LakesBoard lakes={lakes} />}
        </Window>
      </div>
    </PageWrapper>
  );
}
