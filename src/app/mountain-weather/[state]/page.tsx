import { notFound } from 'next/navigation';
import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { LargeTitle } from '@/components/hub/SectionHeader';
import { Card } from '@/components/hub/Card';
import { ListGroup, ListRow } from '@/components/hub/ListRow';
import { MoreSourcesSection } from '@/components/mountain-weather/MoreSourcesSection';
import { WeatherGlanceList } from '@/components/weather/WeatherGlanceList';
import {
  getMountainState,
  isMountainStateSlug,
  resolveMountainStateSlug,
} from '@/lib/mountain-weather/places';
import { moreSourcesForState } from '@/lib/mountain-weather/more-sources';
import { mountainWeatherPath } from '@/lib/mountain-weather/slugs';
import { ScopeBulletinsSection } from '@/components/mountain-weather/ScopeBulletinsSection';
import {
  bulletinOfficesForState,
  readBulletinsForOffices,
} from '@/lib/mountain-weather/read-scope-bulletins';
import { loadStateSectionGlances } from '@/lib/weather-hub';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return [
    { state: 'new-york' },
    { state: 'vermont' },
    { state: 'new-hampshire' },
    { state: 'maine' },
  ];
}

export default async function MountainStatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state: stateParam } = await params;
  if (!isMountainStateSlug(stateParam)) notFound();
  const stateCode = resolveMountainStateSlug(stateParam);
  if (!stateCode) notFound();
  const entry = getMountainState(stateCode);
  if (!entry) notFound();

  const bulletinOffices = bulletinOfficesForState(stateCode);
  const [glances, moreSources, bulletins] = await Promise.all([
    loadStateSectionGlances(stateCode),
    Promise.resolve(moreSourcesForState(stateCode)),
    readBulletinsForOffices(bulletinOffices),
  ]);

  return (
    <PageWrapper>
      <div className="mx-auto max-w-5xl space-y-5 px-4 pb-12 pt-6 md:pt-8">
        <p className="text-sm">
          <Link href="/mountain-weather" className="font-bold underline">Mountain Weather</Link>
        </p>
        <LargeTitle title={entry.name} />
        <ScopeBulletinsSection bundles={bulletins} />
        <Card title="Sections" padded={false}>
          <WeatherGlanceList items={glances} />
        </Card>
        <Card title="All sections" padded={false}>
          <ListGroup bare>
            {entry.sections.map((section) => (
              <ListRow
                key={section.id}
                href={mountainWeatherPath(stateCode, section.id)}
                title={section.title}
                subtitle={`${section.places.length} places`}
              />
            ))}
          </ListGroup>
        </Card>
        <MoreSourcesSection groups={moreSources} />
      </div>
    </PageWrapper>
  );
}
