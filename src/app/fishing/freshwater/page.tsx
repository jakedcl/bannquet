import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';
import { RiversBoard } from '@/components/fishing/RiversBoard';
import { loadParkingAreas } from '@/lib/fishing/pfr';
import type { GaugeView } from '@/lib/fishing/readings';
import { loadMountainGauges } from '@/lib/fishing/usgs';

export const dynamic = 'force-dynamic';

const UNAVAILABLE = 'Data unavailable';

export default async function FreshwaterPage() {
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

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <PageWrapper>
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 md:py-10">
        <Window title="Freshwater">
          <p className="mb-4 text-sm text-gray-700">
            Mountain rivers in the Catskills, Adirondacks, Greens, Whites, and Maine.
          </p>
          <RiversBoard
            gauges={gauges}
            gaugesUnavailable={gaugesUnavailable}
            parking={parking.areas}
            parkingError={parkingUnavailable ? UNAVAILABLE : null}
            parkingTruncated={parking.truncated}
            now={now}
          />
        </Window>
      </div>
    </PageWrapper>
  );
}
