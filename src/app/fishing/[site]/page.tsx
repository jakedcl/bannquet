import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GaugeForecast, GaugeSpot } from '@/components/fishing/GaugeSpot';
import { Window } from '@/components/retro/Window';
import { CrumbLeaf } from '@/components/ui/BackBar';
import PageWrapper from '@/components/ui/PageWrapper';
import { easternMonthDay, loadDailyMedians } from '@/lib/fishing/daily-stats';
import { withVerdicts } from '@/lib/fishing/flow-verdict';
import { plainWaterName, type GaugeView } from '@/lib/fishing/readings';
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
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  let shown = gauge;
  if (gauge) {
    try {
      const { month, day } = easternMonthDay(now);
      const medians = await loadDailyMedians([gauge.site], month, day);
      shown = withVerdicts([gauge], medians)[0] ?? gauge;
    } catch {
      console.error('Gauge median did not load', site);
    }
  }

  return (
    <PageWrapper>
      <CrumbLeaf label={shown ? plainWaterName(shown.name) : 'Gauge'} />
      <div className="mx-auto max-w-3xl px-4 py-10">
        {unavailable ? (
          <Window title="Gauge">
            <p className="text-sm font-bold">Data unavailable</p>
          </Window>
        ) : shown ? (
          <GaugeSpot gauge={shown} now={now} forecast={<GaugeForecast gauge={shown} />} />
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
