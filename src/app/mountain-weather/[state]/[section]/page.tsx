import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { PageHero } from '@/components/hub/PageHero';
import { Card } from '@/components/hub/Card';
import { MoreSourcesSection } from '@/components/mountain-weather/MoreSourcesSection';
import { WeatherGlanceList } from '@/components/weather/WeatherGlanceList';
import {
  getMountainSection,
  getMountainState,
  isMountainStateSlug,
  resolveMountainStateSlug,
} from '@/lib/mountain-weather/places';
import { moreSourcesForSection } from '@/lib/mountain-weather/more-sources';
import { ScopeBulletinsSection } from '@/components/mountain-weather/ScopeBulletinsSection';
import {
  bulletinOfficesForSection,
  readBulletinsForOffices,
} from '@/lib/mountain-weather/read-scope-bulletins';
import { loadPlaceGlances } from '@/lib/weather-hub';

export const dynamic = 'force-dynamic';

export default async function MountainSectionPage({
  params,
}: {
  params: Promise<{ state: string; section: string }>;
}) {
  const { state: stateParam, section: sectionId } = await params;
  if (!isMountainStateSlug(stateParam)) notFound();
  const stateCode = resolveMountainStateSlug(stateParam);
  if (!stateCode) notFound();
  const stateEntry = getMountainState(stateCode);
  const section = getMountainSection(stateCode, sectionId);
  if (!stateEntry || !section) notFound();

  const bulletinOffices = bulletinOfficesForSection(stateCode, sectionId);
  const [glances, moreSources, bulletins] = await Promise.all([
    loadPlaceGlances(stateCode, sectionId),
    Promise.resolve(moreSourcesForSection(stateCode, sectionId)),
    readBulletinsForOffices(bulletinOffices),
  ]);

  return (
    <PageWrapper>
      <PageHero eyebrow={`Mountain weather · ${stateEntry.name}`} title={section.title} subtitle={`${glances.length} places`} />
      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-12 pt-4">
        <Card title="Places" padded={false}>
          <WeatherGlanceList items={glances} />
        </Card>
        <ScopeBulletinsSection bundles={bulletins} />
        <MoreSourcesSection groups={moreSources} />
      </div>
    </PageWrapper>
  );
}
