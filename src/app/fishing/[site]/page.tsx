import { notFound } from 'next/navigation';
import { GaugeForecast, GaugeSpot } from '@/components/fishing/GaugeSpot';
import { Card } from '@/components/hub/Card';
import PageWrapper from '@/components/ui/PageWrapper';
import { easternMonthDay, loadDailyMedians } from '@/lib/fishing/daily-stats';
import { withVerdicts } from '@/lib/fishing/flow-verdict';
import { plainWaterName, type GaugeView } from '@/lib/fishing/readings';
import { MOUNTAIN_GAUGES } from '@/lib/fishing/gauges';
import { loadMountainGauges } from '@/lib/fishing/usgs';
import { HubPage } from '@/components/hub/Page';

export const dynamic = 'force-dynamic';

const SITE = /^\d+$/;

export default async function FishingSpotPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  if (!SITE.test(site) || !MOUNTAIN_GAUGES.some((gauge) => gauge.site === site)) notFound();

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
    <PageWrapper leaf={shown ? plainWaterName(shown.name) : 'Gauge'}>
      <HubPage title={shown ? plainWaterName(shown.name) : 'Gauge'} eyebrow="Freshwater" width="3xl">
        {unavailable ? (
          <Card>
            <p className="text-sm font-bold">Data unavailable</p>
          </Card>
        ) : shown ? (
          <GaugeSpot gauge={shown} now={now} forecast={<GaugeForecast gauge={shown} />} />
        ) : (
          <Card>
            <p className="text-sm font-bold">That gauge is not in this list.</p>
          </Card>
        )}
      </HubPage>
    </PageWrapper>
  );
}
