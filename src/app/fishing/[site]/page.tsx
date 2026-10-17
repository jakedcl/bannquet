import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GaugeForecast, GaugeSpot } from '@/components/fishing/GaugeSpot';
import { Window } from '@/components/retro/Window';
import { CrumbLeaf } from '@/components/ui/BackBar';
import PageWrapper from '@/components/ui/PageWrapper';
import type { GaugeView } from '@/lib/fishing/readings';
import { loadMountainGauges } from '@/lib/fishing/usgs';

export const dynamic = 'force-dynamic';

const SITE = /^\d+$/;

export default async function FishingSpotPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  if (!SITE.test(site)) notFound();

  let gauges: GaugeView[] = [];
  let unavailable = false;
  try {
    gauges = await loadMountainGauges();
  } catch {
    console.error('Mountain gauges did not load');
    unavailable = true;
  }

  const gauge = gauges.find((item) => item.site === site) ?? null;
  // Server clock so the age label in the HTML matches the client.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <PageWrapper>
      <CrumbLeaf label={gauge?.name ?? 'Gauge'} />
      <div className="mx-auto max-w-3xl px-4 py-10">
        {unavailable ? (
          <Window title="Gauge">
            <p className="text-sm font-bold">Data unavailable</p>
          </Window>
        ) : gauge ? (
          <GaugeSpot gauge={gauge} now={now} forecast={<GaugeForecast gauge={gauge} />} />
        ) : (
          <Window title="Gauge">
            <p className="text-sm font-bold">That gauge is not in this list.</p>
            <p className="mt-3 text-sm">
              <Link href="/fishing/freshwater" className="font-bold underline">Freshwater</Link>
            </p>
          </Window>
        )}
      </div>
    </PageWrapper>
  );
}
