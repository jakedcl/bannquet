import PageWrapper from '@/components/ui/PageWrapper';
import { PageHero } from '@/components/hub/PageHero';
import { MapsSection } from '@/components/mountain-weather/MapsSection';
import { readMapsHub } from '@/lib/mountain-weather/read-place-maps';
import { placeCount } from '@/lib/mountain-weather/places';

export const metadata = { title: 'Weather maps' };

export const dynamic = 'force-dynamic';

export default async function MountainMapsHubPage() {
  const hub = await readMapsHub();
  return (
    <PageWrapper>
      <PageHero eyebrow="Mountain weather" title="Maps" />
      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-12 pt-4">
        <p className="text-meta text-ink-2">
          Radar loops (NWS RIDGE), GOES-19 satellite and GLM lightning, active NWS alerts, and {placeCount()} places on one map, from the same sources as the place pages.
        </p>
        <MapsSection data={hub} />
      </div>
    </PageWrapper>
  );
}