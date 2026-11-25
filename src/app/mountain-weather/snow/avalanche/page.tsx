import PageWrapper from '@/components/ui/PageWrapper';
import { PageHero } from '@/components/hub/PageHero';
import { Card } from '@/components/hub/Card';
import { ListGroup, ListRow } from '@/components/hub/ListRow';
import { AvalancheSection } from '@/components/mountain-weather/AvalancheSection';
import { avalancheAvgPoints } from '@/lib/mountain-weather/avalanche-bindings';
import { readAvalancheHub } from '@/lib/mountain-weather/read-place-avalanche';

export const metadata = { title: 'Avalanche forecasts' };

export const dynamic = 'force-dynamic';

export default async function AvalancheHubPage() {
  const hub = await readAvalancheHub();
  const overview: Parameters<typeof AvalancheSection>[0]['data'] = {
    binding: {
      centers: ['MWAC', 'NYSAC'],
      bindReason: '',
    },
    centers: [hub.mwac, hub.nysac],
    avg: null,
  };

  const points = avalancheAvgPoints();

  return (
    <PageWrapper>
      <PageHero eyebrow="Mountain weather · Snow" title="Avalanche" subtitle="Official forecasts from the Mount Washington and Adirondack avalanche centers." />
      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-12 pt-4">
        <p className="text-meta text-ink-2">Check the issued and expiration times. No forecast during the off-season does not mean low danger. The NWS avalanche weather guidance below describes weather, not avalanche danger.</p>
        <AvalancheSection data={overview} showAvg={false} />
        <Card title="Avalanche weather guidance" padded={false}>
          <p className="border-b border-hairline bg-surface-cream px-3.5 py-2 text-caption text-ink-2">
            NWS weather guidance for {points.length} mountain areas. This is separate from the avalanche center&apos;s danger forecast.
          </p>
          <ListGroup bare>
            {points.map((p) => (
              <ListRow key={p.slug} href={`/mountain-weather/snow/avalanche/${p.slug}`} title={p.title} subtitle={`NWS ${p.office}`} />
            ))}
          </ListGroup>
        </Card>
        <Card title="On a place page" padded={false}>
          <ListGroup bare>
            <ListRow href="/mountain-weather/new-hampshire/presidential-range/mount-washington?tab=snow" title="Mount Washington" subtitle="Snow tab" />
            <ListRow href="/mountain-weather/new-york/adirondack-high-peaks/mount-marcy?tab=snow" title="Mount Marcy" subtitle="Snow tab" />
          </ListGroup>
        </Card>
      </div>
    </PageWrapper>
  );
}
