import { notFound } from 'next/navigation';
import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { LargeTitle } from '@/components/hub/SectionHeader';
import { BasicForecastSection } from '@/components/mountain-weather/BasicForecastSection';
import { MoreSourcesSection } from '@/components/mountain-weather/MoreSourcesSection';
import {
  getMountainPlace,
  getMountainSection,
  getMountainState,
  isMountainStateCode,
} from '@/lib/mountain-weather/places';
import { moreSourcesForPlace } from '@/lib/mountain-weather/more-sources';
import { readNwsGridBaseline } from '@/lib/mountain-weather/readers/nws-grid-baseline';

export const dynamic = 'force-dynamic';

export default async function MountainPlacePage({
  params,
}: {
  params: Promise<{ state: string; section: string; place: string }>;
}) {
  const { state, section: sectionId, place: placeId } = await params;
  if (!isMountainStateCode(state)) notFound();
  const stateEntry = getMountainState(state);
  const section = getMountainSection(state, sectionId);
  const place = getMountainPlace(state, sectionId, placeId);
  if (!stateEntry || !section || !place) notFound();

  const baseline = await readNwsGridBaseline(place);
  const moreSources = moreSourcesForPlace(state, place);

  return (
    <PageWrapper>
      <div className="mx-auto max-w-3xl space-y-5 px-4 pb-12 pt-6 md:pt-8">
        <nav className="text-sm" aria-label="Breadcrumb">
          <Link href="/mountain-weather" className="font-bold underline">Mountain Weather</Link>
          {' · '}
          <Link href={`/mountain-weather/${state}`} className="font-bold underline">{stateEntry.name}</Link>
          {' · '}
          <Link href={`/mountain-weather/${state}/${sectionId}`} className="font-bold underline">{section.title}</Link>
        </nav>
        <LargeTitle
          title={place.name}
          eyebrow={place.isBase ? 'Base' : 'Summit'}
        />
        <p className="text-sm text-gray-700">
          {place.elevationFt !== null ? `${place.elevationFt.toLocaleString('en-US')} ft · ` : ''}
          NWS {place.office} · {place.lat.toFixed(4)}, {place.lon.toFixed(4)}
        </p>
        <BasicForecastSection result={baseline} placeName={place.name} placeElevationFt={place.elevationFt} />
        <MoreSourcesSection groups={moreSources} />
      </div>
    </PageWrapper>
  );
}
