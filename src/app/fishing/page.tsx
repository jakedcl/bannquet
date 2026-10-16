import { redirect } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { Window } from '@/components/retro/Window';
import { RiversBoard } from '@/components/fishing/RiversBoard';
import { loadParkingAreas } from '@/lib/fishing/pfr';
import type { GaugeView } from '@/lib/fishing/readings';
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
            now={now}
          />
        </Window>
      </div>
    </PageWrapper>
  );
}
