import { notFound } from 'next/navigation';
import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { LargeTitle } from '@/components/hub/SectionHeader';
import { BasicForecastSection } from '@/components/mountain-weather/BasicForecastSection';
import { AllLocationsSection } from '@/components/mountain-weather/AllLocationsSection';
import { MountainForecastSection } from '@/components/mountain-weather/MountainForecastSection';
import { AvgForecastSection } from '@/components/mountain-weather/AvgForecastSection';
import { RecForecastSection } from '@/components/mountain-weather/RecForecastSection';
import { MansfieldPackSection } from '@/components/mountain-weather/MansfieldPackSection';
import { WeatherHazardsHeader } from '@/components/mountain-weather/WeatherHazardsHeader';
import { buildMtnDisplay } from '@/lib/mountain-weather/mtn-display';
import { MoreSourcesSection } from '@/components/mountain-weather/MoreSourcesSection';
import {
  getMountainPlace,
  getMountainSection,
  getMountainState,
  isMountainStateSlug,
  resolveMountainStateSlug,
} from '@/lib/mountain-weather/places';
import { moreSourcesForPlace } from '@/lib/mountain-weather/more-sources';
import { mountainWeatherPath } from '@/lib/mountain-weather/slugs';
import { readAvgForPlace } from '@/lib/mountain-weather/read-place-avg';
import { readAllLocationsForPlace, readRecForPlace } from '@/lib/mountain-weather/read-place-rec';
import { readMansfieldPack } from '@/lib/mountain-weather/read-mansfield-pack';
import { readMtnPointForPlace } from '@/lib/mountain-weather/read-mtn-point';
import { readNwsGridBaseline } from '@/lib/mountain-weather/readers/nws-grid-baseline';

export const dynamic = 'force-dynamic';

export default async function MountainPlacePage({
  params,
}: {
  params: Promise<{ state: string; section: string; place: string }>;
}) {
  const { state: stateParam, section: sectionId, place: placeId } = await params;
  if (!isMountainStateSlug(stateParam)) notFound();
  const stateCode = resolveMountainStateSlug(stateParam);
  if (!stateCode) notFound();
  const stateEntry = getMountainState(stateCode);
  const section = getMountainSection(stateCode, sectionId);
  const place = getMountainPlace(stateCode, sectionId, placeId);
  if (!stateEntry || !section || !place) notFound();

  const [baseline, mtnPoint, rec, avg, allLocations, mansfieldPack] = await Promise.all([
    readNwsGridBaseline(place),
    readMtnPointForPlace(place.id),
    readRecForPlace(place.id),
    readAvgForPlace(place.id),
    readAllLocationsForPlace(place.id),
    readMansfieldPack(place.id),
  ]);
  const moreSources = moreSourcesForPlace(stateCode, sectionId, place);

  return (
    <PageWrapper>
      <div className="mx-auto max-w-5xl space-y-5 px-4 pb-12 pt-6 md:pt-8">
        <nav className="text-sm" aria-label="Breadcrumb">
          <Link href="/mountain-weather" className="font-bold underline">Mountain Weather</Link>
          {' · '}
          <Link href={mountainWeatherPath(stateCode)} className="font-bold underline">{stateEntry.name}</Link>
          {' · '}
          <Link href={mountainWeatherPath(stateCode, sectionId)} className="font-bold underline">{section.title}</Link>
        </nav>
        <LargeTitle
          title={place.name}
          eyebrow={place.isBase ? 'Base' : 'Summit'}
        />
        {baseline.data?.hazards?.length ? <WeatherHazardsHeader hazards={baseline.data.hazards} /> : null}
        <p className="text-sm text-gray-700">
          {(() => {
            const nwsElev = mtnPoint?.data ? buildMtnDisplay(mtnPoint.data).meta.nwsElevationFt : null;
            const elev =
              nwsElev !== null && nwsElev !== undefined
                ? `${nwsElev.toLocaleString('en-US')} ft (NWS)`
                : place.elevationFt !== null
                  ? `${place.elevationFt.toLocaleString('en-US')} ft (catalog)`
                  : null;
            return elev ? `${elev} · ` : '';
          })()}
          NWS {place.office} · {place.lat.toFixed(4)}, {place.lon.toFixed(4)}
        </p>
        <MountainForecastSection result={mtnPoint} placeName={place.name} />
        <RecForecastSection results={rec} />
        <AvgForecastSection results={avg} />
        <AllLocationsSection results={allLocations} />
        <MansfieldPackSection pack={mansfieldPack} />
        <BasicForecastSection result={baseline} placeName={place.name} placeElevationFt={place.elevationFt} />
        <MoreSourcesSection groups={moreSources} />
      </div>
    </PageWrapper>
  );
}
