import { notFound } from 'next/navigation';
import PageWrapper from '@/components/ui/PageWrapper';
import { Switcher } from '@/components/hub/Switcher';
import { PlaceHero } from '@/components/mountain-weather/PlaceHero';
import { AboutSourcesSection } from '@/components/mountain-weather/AboutSourcesSection';
import { PlaceFactsSection } from '@/components/mountain-weather/PlaceFactsSection';
import {
  BaselineError,
  ForecastNowPanel,
  GridDetailsPanel,
  Next48Panel,
  SevenDayPanel,
} from '@/components/mountain-weather/BasicForecastSection';
import { ForecastAtAGlance } from '@/components/mountain-weather/ForecastAtAGlance';
import { AllLocationsSection } from '@/components/mountain-weather/AllLocationsSection';
import { MountainForecastSection } from '@/components/mountain-weather/MountainForecastSection';
import { AvgForecastSection } from '@/components/mountain-weather/AvgForecastSection';
import { RecForecastSection } from '@/components/mountain-weather/RecForecastSection';
import { BalloonForecastSection } from '@/components/mountain-weather/BalloonForecastSection';
import { MansfieldPackSection } from '@/components/mountain-weather/MansfieldPackSection';
import { WeatherHazardsHeader } from '@/components/mountain-weather/WeatherHazardsHeader';
import { PageSourcesSection } from '@/components/mountain-weather/PageSourcesSection';
import { Suspense } from 'react';
import { BulletinsSection } from '@/components/mountain-weather/BulletinsSection';
import { ObservationsSection } from '@/components/mountain-weather/ObservationsSection';
import { AvalancheSection } from '@/components/mountain-weather/AvalancheSection';
import { AvalancheStatus } from '@/components/mountain-weather/AvalancheStatus';
import { SnowSection } from '@/components/mountain-weather/SnowSection';
import { MapsSection } from '@/components/mountain-weather/MapsSection';
import { SkySection } from '@/components/mountain-weather/SkySection';
import { LandAccessSection, RoadAndAirSection, groundSourceNotes } from '@/components/mountain-weather/GroundAccessSection';
import {
  getMountainPlace,
  getMountainSection,
  getMountainState,
  isMountainStateSlug,
  resolveMountainStateSlug,
} from '@/lib/mountain-weather/places';
import { readPageSources, type PageSourceTab } from '@/lib/mountain-weather/page-sources';
import { mountainWeatherPath } from '@/lib/mountain-weather/slugs';
import { readAvgForPlace } from '@/lib/mountain-weather/read-place-avg';
import { readAllLocationsForPlace, readRecForPlace } from '@/lib/mountain-weather/read-place-rec';
import { bulletinOfficeForPlace } from '@/lib/mountain-weather/bulletin-bindings';
import { readBalloonForPlace } from '@/lib/mountain-weather/read-place-balloon';
import { readOfficeBulletins } from '@/lib/mountain-weather/read-office-bulletins';
import { readMansfieldPack } from '@/lib/mountain-weather/read-mansfield-pack';
import { readPlaceObservations } from '@/lib/mountain-weather/read-place-observations';
import { readPlaceAvalanche } from '@/lib/mountain-weather/read-place-avalanche';
import { readPlaceSnow } from '@/lib/mountain-weather/read-place-snow';
import { readMtnPointForPlace } from '@/lib/mountain-weather/read-mtn-point';
import { readNwsGridBaseline } from '@/lib/mountain-weather/readers/nws-grid-baseline';
import { readPlaceMaps } from '@/lib/mountain-weather/read-place-maps';
import { readPlaceSky } from '@/lib/mountain-weather/read-place-sky';
import { readPlaceGround } from '@/lib/mountain-weather/read-place-ground';
import { USNO_API_TWILIGHT_NOTE } from '@/lib/mountain-weather/read-place-sky';
import { formatClock12 } from '@/lib/mountain-weather/format-display';

export const dynamic = 'force-dynamic';

const TABS = [
  { id: 'forecast', label: 'Forecast' },
  { id: 'measured', label: 'Measured' },
  { id: 'snow', label: 'Snow' },
  { id: 'maps', label: 'Maps' },
  { id: 'more', label: 'More' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function tabOf(value: string | string[] | undefined): TabId {
  const id = Array.isArray(value) ? value[0] : value;
  return TABS.find((tab) => tab.id === id)?.id ?? 'forecast';
}

/**
 * A mountain place: header (hero, alerts, avalanche status, sun times) on
 * every tab, then one of five tabs. Each tab only reads its own sources.
 * See docs/internal/weather-inventory.md for where each source lives.
 */
export default async function MountainPlacePage({
  params,
  searchParams,
}: {
  params: Promise<{ state: string; section: string; place: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { state: stateParam, section: sectionId, place: placeId } = await params;
  const tab = tabOf((await searchParams).tab);
  if (!isMountainStateSlug(stateParam)) notFound();
  const stateCode = resolveMountainStateSlug(stateParam);
  if (!stateCode) notFound();
  const stateEntry = getMountainState(stateCode);
  const section = getMountainSection(stateCode, sectionId);
  const place = getMountainPlace(stateCode, sectionId, placeId);
  if (!stateEntry || !section || !place) notFound();

  const path = mountainWeatherPath(stateCode, sectionId, place.id);
  const tabHref = (id: TabId) => (id === 'forecast' ? path : `${path}?tab=${id}`);
  const bulletinOffice = bulletinOfficeForPlace(place.id)?.office ?? null;
  const skip = Promise.resolve(null);

  // Header data on every tab; the rest only for the open tab.
  const [baseline, avalanche, sky] = await Promise.all([
    readNwsGridBaseline(place),
    readPlaceAvalanche(place.id),
    readPlaceSky(place),
  ]);
  const [mtnPoint, rec, allLocations, balloon, bulletins, mansfieldPack, observations, ground, avg, snow, maps] =
    await Promise.all([
      tab === 'forecast' ? readMtnPointForPlace(place.id) : skip,
      tab === 'forecast' ? readRecForPlace(place.id) : skip,
      tab === 'forecast' ? readAllLocationsForPlace(place.id) : skip,
      tab === 'forecast' ? readBalloonForPlace(place.id) : skip,
      tab === 'forecast' && bulletinOffice ? readOfficeBulletins(bulletinOffice) : skip,
      tab === 'forecast' || tab === 'measured' || tab === 'snow' ? readMansfieldPack(place.id) : skip,
      tab === 'measured' ? readPlaceObservations(place.id) : skip,
      tab === 'measured' || tab === 'more' ? readPlaceGround(place, stateCode, sectionId) : skip,
      tab === 'snow' && !avalanche ? readAvgForPlace(place.id) : skip,
      tab === 'snow' ? readPlaceSnow(place) : skip,
      tab === 'maps' ? readPlaceMaps(place, { state: stateCode, sectionId }) : skip,
    ]);

  const today = sky.days[0];
  const sunrise = formatClock12(today?.sunEvents.find((event) => event.phen === 'Rise')?.display);
  const sunset = formatClock12(today?.sunEvents.find((event) => event.phen === 'Set')?.display);

  return (
    <PageWrapper leaf={place.name}>
      <PlaceHero
        place={place}
        eyebrow={`${section.title} · ${stateCode.toUpperCase()}${place.elevationFt != null ? ` · ${place.elevationFt.toLocaleString('en-US')} ft` : ''}`}
        baseline={baseline}
      />
      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-12 pt-4">
        <Switcher label="Weather for this place" value={tab} items={TABS.map((t) => ({ id: t.id, label: t.label, href: tabHref(t.id) }))} />
        {baseline.data?.hazards?.length ? <WeatherHazardsHeader hazards={baseline.data.hazards} /> : null}
        <AvalancheStatus data={avalanche} snowHref={tabHref('snow')} onlyIssued />
        {sunrise || sunset ? (
          <p className="panel flex items-center gap-4 px-3.5 py-2.5 text-meta">
            <span>Sunrise <b>{sunrise ?? '—'}</b></span>
            <span>Sunset <b>{sunset ?? '—'}</b></span>
            {tab !== 'more' ? (
              <a href={`${tabHref('more')}#sun-moon`} className="ml-auto font-bold underline">More ›</a>
            ) : null}
          </p>
        ) : null}

        {tab === 'forecast' ? (
          <>
            <BaselineError result={baseline} />
            <ForecastAtAGlance result={baseline} placeName={place.name} placeElevationFt={place.elevationFt} />
            <MountainForecastSection result={mtnPoint} placeName={place.name} />
            <ForecastNowPanel result={baseline} placeElevationFt={place.elevationFt} />
            <Next48Panel result={baseline} />
            <SevenDayPanel result={baseline} />
            <RecForecastSection results={rec ?? []} />
            <AllLocationsSection results={allLocations ?? []} />
            <BalloonForecastSection result={balloon} />
            <MansfieldPackSection pack={mansfieldPack} part="forecast" />
            <GridDetailsPanel result={baseline} />
            <BulletinsSection bundle={bulletins} />
          </>
        ) : null}

        {tab === 'measured' ? (
          <>
            <MansfieldPackSection pack={mansfieldPack} part="measured" />
            <ObservationsSection data={observations} placeElevationFt={place.elevationFt} />
            {ground ? <RoadAndAirSection data={ground} /> : null}
          </>
        ) : null}

        {tab === 'snow' ? (
          <>
            {avalanche ? <div id="avalanche-guidance"><AvalancheSection data={avalanche} /></div> : null}
            {!avalanche ? <AvgForecastSection results={avg ?? []} /> : null}
            <MansfieldPackSection pack={mansfieldPack} part="snow" />
            {snow ? <SnowSection data={snow} placeName={place.name} /> : null}
          </>
        ) : null}

        {tab === 'maps' && maps ? <MapsSection data={maps} place={place} /> : null}

        {tab === 'more' ? (
          <>
            <div id="sun-moon"><SkySection data={sky} /></div>
            <PlaceFactsSection place={place} stateName={stateEntry.name} sectionTitle={section.title} />
            {ground ? <LandAccessSection data={ground} /> : null}
            <Suspense fallback={<p className="panel px-3.5 py-3 text-meta text-ink-2">Checking every source for this page…</p>}>
              <PlaceSources place={place} stateCode={stateCode} sectionId={sectionId} path={path} />
            </Suspense>
            <AboutSourcesSection notes={[...(ground ? groundSourceNotes(ground) : []), USNO_API_TWILIGHT_NOTE]} />
          </>
        ) : null}
      </div>
    </PageWrapper>
  );
}

/** Streams in after the rest of the More tab: it reads every source the other tabs use. */
async function PlaceSources({
  place,
  stateCode,
  sectionId,
  path,
}: {
  place: NonNullable<ReturnType<typeof getMountainPlace>>;
  stateCode: NonNullable<ReturnType<typeof resolveMountainStateSlug>>;
  sectionId: string;
  path: string;
}) {
  const sources = await readPageSources(place, stateCode, sectionId);
  const landHrefs = new Set((await readPlaceGround(place, stateCode, sectionId)).landLinks.map((l) => l.href));
  const tabHref = (tab: PageSourceTab) => (tab === 'forecast' ? path : `${path}?tab=${tab}`);
  return <PageSourcesSection sources={{ ...sources, links: sources.links.filter((l) => !landHrefs.has(l.href)) }} tabHref={tabHref} />;
}
