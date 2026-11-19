import { notFound } from 'next/navigation';
import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { PageHero } from '@/components/hub/PageHero';
import { ChevronIcon } from '@/components/hub/Icons';
import { Card } from '@/components/hub/Card';
import { MoreSourcesSection } from '@/components/mountain-weather/MoreSourcesSection';
import { WeatherGlanceList } from '@/components/weather/WeatherGlanceList';
import {
  getMountainState,
  isMountainStateSlug,
  resolveMountainStateSlug,
} from '@/lib/mountain-weather/places';
import { moreSourcesForState } from '@/lib/mountain-weather/more-sources';
import { ScopeBulletinsSection } from '@/components/mountain-weather/ScopeBulletinsSection';
import {
  bulletinOfficesForState,
  readBulletinsForOffices,
} from '@/lib/mountain-weather/read-scope-bulletins';
import { loadStatePlaceGlancesGrouped } from '@/lib/weather-hub';

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
  const [sections, moreSources, bulletins] = await Promise.all([
    loadStatePlaceGlancesGrouped(stateCode),
    Promise.resolve(moreSourcesForState(stateCode)),
    readBulletinsForOffices(bulletinOffices),
  ]);

  const placeTotal = sections.reduce((n, group) => n + group.places.length, 0);

  return (
    <PageWrapper>
      <PageHero
        eyebrow="Mountain weather"
        title={entry.name}
        subtitle={`${placeTotal} places in ${sections.length} sections`}
      />
      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-12 pt-4">
        <ScopeBulletinsSection bundles={bulletins} />
        <Card title="Places by section" padded={false}>
          <p className="border-b border-hairline bg-surface-cream px-3.5 py-2 text-caption text-ink-2">
            NWS forecasts for each place. Open a place for hourly detail and nearby measured conditions.
          </p>
          {sections.map((group) => (
            <section key={group.sectionId} className="min-w-0 border-b border-hairline last:border-b-0">
              <h2>
                <Link
                  href={group.href}
                  className="ui-row-press flex min-h-11 items-center gap-2 border-b border-hairline bg-surface-cream px-3.5 py-2 font-heading text-caption font-bold uppercase tracking-label no-underline"
                >
                  <span className="min-w-0 flex-1">{group.title}</span>
                  <ChevronIcon className="h-3 w-2 shrink-0 text-brown-light" />
                </Link>
              </h2>
              <WeatherGlanceList items={group.places} />
            </section>
          ))}
        </Card>
        <MoreSourcesSection groups={moreSources} />
      </div>
    </PageWrapper>
  );
}
