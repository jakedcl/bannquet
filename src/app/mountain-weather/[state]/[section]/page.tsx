import { notFound } from 'next/navigation';
import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { LargeTitle } from '@/components/hub/SectionHeader';
import { Card } from '@/components/hub/Card';
import { ListGroup, ListRow } from '@/components/hub/ListRow';
import { MoreSourcesSection } from '@/components/mountain-weather/MoreSourcesSection';
import { WeatherGlanceList } from '@/components/weather/WeatherGlanceList';
import {
  getMountainSection,
  getMountainState,
  isMountainStateSlug,
  resolveMountainStateSlug,
} from '@/lib/mountain-weather/places';
import { moreSourcesForSection } from '@/lib/mountain-weather/more-sources';
import { mountainWeatherPath } from '@/lib/mountain-weather/slugs';
import { BulletinsSection } from '@/components/mountain-weather/BulletinsSection';
import { bulletinOfficeForSection } from '@/lib/mountain-weather/bulletin-bindings';
import { readOfficeBulletins } from '@/lib/mountain-weather/read-office-bulletins';
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

  const sectionBulletin = bulletinOfficeForSection(sectionId);
  const [glances, moreSources, bulletins] = await Promise.all([
    loadPlaceGlances(stateCode, sectionId),
    Promise.resolve(moreSourcesForSection(stateCode, sectionId)),
    sectionBulletin?.office ? readOfficeBulletins(sectionBulletin.office) : Promise.resolve(null),
  ]);

  return (
    <PageWrapper>
      <div className="mx-auto max-w-5xl space-y-5 px-4 pb-12 pt-6 md:pt-8">
        <p className="text-sm">
          <Link href="/mountain-weather" className="font-bold underline">Mountain Weather</Link>
          {' · '}
          <Link href={mountainWeatherPath(stateCode)} className="font-bold underline">{stateEntry.name}</Link>
        </p>
        <LargeTitle title={section.title} />
        <BulletinsSection bundle={bulletins} />
        <Card title="Places" padded={false}>
          <WeatherGlanceList items={glances} />
        </Card>
        <Card padded={false}>
          <ListGroup bare>
            {section.places.map((place) => (
              <ListRow
                key={place.id}
                href={mountainWeatherPath(stateCode, sectionId, place.id)}
                title={place.name}
                subtitle={[
                  place.elevationFt ? `${place.elevationFt.toLocaleString('en-US')} ft` : null,
                  place.isBase ? 'Base' : null,
                  `NWS ${place.office}`,
                ].filter(Boolean).join(' · ')}
              />
            ))}
          </ListGroup>
        </Card>
        <MoreSourcesSection groups={moreSources} />
      </div>
    </PageWrapper>
  );
}
