import { notFound } from 'next/navigation';
import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { LargeTitle } from '@/components/hub/SectionHeader';
import { Card } from '@/components/hub/Card';
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

  return (
    <PageWrapper>
      <div className="mx-auto max-w-5xl space-y-5 px-4 pb-12 pt-6 md:pt-8">
        <p className="text-sm">
          <Link href="/mountain-weather" className="font-bold underline">Mountain Weather</Link>
        </p>
        <LargeTitle title={entry.name} />
        <ScopeBulletinsSection bundles={bulletins} />
        <Card title="Places by section" padded={false}>
          <p className="border-b border-[#5c3a1e]/20 px-3 py-2 text-xs text-gray-700">
            One NWS baseline line per catalog place (same cache as place pages).
          </p>
          <div className="divide-y divide-[#5c3a1e]/15">
            {sections.map((group) => (
              <section key={group.sectionId} className="min-w-0">
                <h2 className="bg-[#f4ebd8] px-3 py-2 text-sm font-bold">
                  <Link href={group.href} className="underline">
                    {group.title}
                  </Link>
                </h2>
                <WeatherGlanceList items={group.places} />
              </section>
            ))}
          </div>
        </Card>
        <MoreSourcesSection groups={moreSources} />
      </div>
    </PageWrapper>
  );
}