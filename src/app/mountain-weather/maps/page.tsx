import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { LargeTitle } from '@/components/hub/SectionHeader';
import { MapsSection } from '@/components/mountain-weather/MapsSection';
import { readMapsHub } from '@/lib/mountain-weather/read-place-maps';
import { placeCount } from '@/lib/mountain-weather/places';

export const dynamic = 'force-dynamic';

export default async function MountainMapsHubPage() {
  const hub = await readMapsHub();
  return (
    <PageWrapper>
      <div className="mx-auto max-w-5xl space-y-5 px-4 pb-12 pt-6">
        <nav className="text-sm">
          <Link href="/mountain-weather" className="font-bold underline">
            Mountain Weather
          </Link>
        </nav>
        <LargeTitle title="Maps" eyebrow="Hub" />
        <p className="text-sm text-gray-700">
          Radar loops (NWS RIDGE), GOES-19 satellite and GLM lightning, active NWS alerts, and {placeCount()} catalog places on one map — all from the same readers used on place pages.
        </p>
        <MapsSection data={hub} />
      </div>
    </PageWrapper>
  );
}