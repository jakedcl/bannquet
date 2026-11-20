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
import { AllLocationsSection } from '@/components/mountain-weather/AllLocationsSection';
import { MountainForecastSection } from '@/components/mountain-weather/MountainForecastSection';
import { AvgForecastSection } from '@/components/mountain-weather/AvgForecastSection';
import { RecForecastSection } from '@/components/mountain-weather/RecForecastSection';
import { BalloonForecastSection } from '@/components/mountain-weather/BalloonForecastSection';
import { MansfieldPackSection } from '@/components/mountain-weather/MansfieldPackSection';
import { WeatherHazardsHeader } from '@/components/mountain-weather/WeatherHazardsHeader';
import { PageSourcesSection } from '@/components/mountain-weather/PageSourcesSection';
import { Suspense, type ReactNode } from 'react';
import { WeatherLoading } from '@/components/mountain-weather/WeatherLoading';
import { BulletinsSection } from '@/components/mountain-weather/BulletinsSection';
import { ObservationsSection } from '@/components/mountain-weather/ObservationsSection';
import { AvalancheSection } from '@/components/mountain-weather/AvalancheSection';
import { AvalancheStatus } from '@/components/mountain-weather/AvalancheStatus';
import { SnowSection } from '@/components/mountain-weather/SnowSection';
import { MapsSection } from '@/components/mountain-weather/MapsSection';
import { SkySection } from '@/components/mountain-weather/SkySection';
import {
  LandAccessSection,
  RoadAndAirSection,
  groundSourceNotes,
} from '@/components/mountain-weather/GroundAccessSection';
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

  // Start independent sources together. Each boundary below waits only for the
  // sources it displays; related panels share these same promises.
  const baseline = readNwsGridBaseline(place);
  const avalanche = readPlaceAvalanche(place.id);
  const sky = readPlaceSky(place);
  const mtnPoint = tab === 'forecast' ? readMtnPointForPlace(place.id) : skip;
  const rec = tab === 'forecast' ? readRecForPlace(place.id) : skip;
  const allLocations = tab === 'forecast' ? readAllLocationsForPlace(place.id) : skip;
  const balloon = tab === 'forecast' ? readBalloonForPlace(place.id) : skip;
  const bulletins = tab === 'forecast' && bulletinOffice ? readOfficeBulletins(bulletinOffice) : skip;
  const mansfieldPack = ['forecast', 'measured', 'snow'].includes(tab) ? readMansfieldPack(place.id) : skip;
  const observations = tab === 'measured' ? readPlaceObservations(place.id) : skip;
  const ground = tab === 'measured' || tab === 'more' ? readPlaceGround(place, stateCode, sectionId) : skip;
  const avg = tab === 'snow' ? avalanche.then((data) => (data ? data.avg : readAvgForPlace(place.id))) : skip;
  const snow = tab === 'snow' ? readPlaceSnow(place) : skip;
  const maps = tab === 'maps' ? readPlaceMaps(place, { state: stateCode, sectionId }) : skip;

  return (
    <PageWrapper leaf={place.name}>
      <Stream label={`${place.name} forecast`} data={baseline}>
        {(baseline) => (
          <PlaceHero
            place={place}
            eyebrow={`${section.title} · ${stateCode.toUpperCase()}${place.elevationFt != null ? ` · ${place.elevationFt.toLocaleString('en-US')} ft` : ''}`}
            baseline={baseline}
          />
        )}
      </Stream>
      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-12 pt-4">
        <Switcher
          label="Weather for this place"
          value={tab}
          items={TABS.map((t) => ({
            id: t.id,
            label: t.label,
            href: tabHref(t.id),
          }))}
        />
        <Stream label="Weather alerts" data={baseline}>
          {(baseline) =>
            baseline.data?.hazards?.length ? <WeatherHazardsHeader hazards={baseline.data.hazards} /> : null
          }
        </Stream>
        <Stream label="Avalanche status" data={avalanche}>
          {(avalanche) => <AvalancheStatus data={avalanche} snowHref={tabHref('snow')} onlyIssued />}
        </Stream>
        <Stream label="Sunrise and sunset" data={sky}>
          {(sky) => {
            const today = sky.days[0];
            const sunrise = formatClock12(today?.sunEvents.find((event) => event.phen === 'Rise')?.display);
            const sunset = formatClock12(today?.sunEvents.find((event) => event.phen === 'Set')?.display);
            return sunrise || sunset ? (
              <p className="panel flex items-center gap-4 px-3.5 py-2.5 text-meta">
                <span>
                  Sunrise <b>{sunrise ?? '—'}</b>
                </span>
                <span>
                  Sunset <b>{sunset ?? '—'}</b>
                </span>
                {tab !== 'more' ? (
                  <a href={`${tabHref('more')}#sun-moon`} className="ml-auto font-bold underline">
                    More ›
                  </a>
                ) : null}
              </p>
            ) : null;
          }}
        </Stream>

        {tab === 'forecast' ? (
          <>
            {/* Order: the hero already says now; then the next two days, the week, what the
                forecasters wrote for the mountains, and the expert detail closed at the end. */}
            <Stream label="Forecast" data={baseline}>
              {(baseline) => (
                <>
                  <BaselineError result={baseline} />
                  <ForecastNowPanel result={baseline} placeElevationFt={place.elevationFt} defaultOpen={false} />
                  <Next48Panel result={baseline} />
                  <SevenDayPanel result={baseline} />
                </>
              )}
            </Stream>
            <Stream label="Mountain forecast" data={rec}>
              {(rec) => <RecForecastSection results={rec ?? []} />}
            </Stream>
            <Stream label="Additional mountain forecast" data={Promise.all([rec, allLocations])}>
              {([rec, allLocations]) => <AllLocationsSection results={allLocationsNotInRec(allLocations, rec)} />}
            </Stream>
            <Stream label="Hourly mountain forecast" data={mtnPoint}>
              {(mtnPoint) => <MountainForecastSection result={mtnPoint} placeName={place.name} />}
            </Stream>
            <Stream label="Mansfield forecast" data={mansfieldPack}>
              {(mansfieldPack) => <MansfieldPackSection pack={mansfieldPack} part="forecast" />}
            </Stream>
            <Stream label="Forecaster discussion" data={bulletins}>
              {(bulletins) => <BulletinsSection bundle={bulletins} />}
            </Stream>
            <Stream label="Grid details" data={baseline}>
              {(baseline) => <GridDetailsPanel result={baseline} />}
            </Stream>
            <Stream label="Winds aloft" data={balloon}>
              {(balloon) => <BalloonForecastSection result={balloon} />}
            </Stream>
          </>
        ) : null}

        {tab === 'measured' ? (
          <>
            <Stream label="Measured conditions" data={Promise.all([mansfieldPack, observations])}>
              {([mansfieldPack, observations]) => (
                <>
                  <MansfieldPackSection pack={mansfieldPack} part="measured" />
                  <ObservationsSection
                    data={observations}
                    placeElevationFt={place.elevationFt}
                    isBase={place.isBase}
                    hasSummitSensor={Boolean(mansfieldPack)}
                  />
                </>
              )}
            </Stream>
            <Stream label="Road weather" data={ground}>
              {(ground) => (ground ? <RoadAndAirSection data={ground} /> : null)}
            </Stream>
          </>
        ) : null}

        {tab === 'snow' ? (
          <>
            {/* Avalanche first, then what is on the ground and falling, then maps, then the
                hour-by-hour avalanche weather table for experts. */}
            <Stream label="Avalanche forecast" data={avalanche}>
              {(avalanche) =>
                avalanche ? (
                  <div id="avalanche-guidance">
                    <AvalancheSection data={avalanche} showAvg={false} />
                  </div>
                ) : null
              }
            </Stream>
            <Stream label="Snow reports" data={Promise.all([snow, mansfieldPack])}>
              {([snow, mansfieldPack]) =>
                snow ? (
                  <SnowSection
                    data={snow}
                    placeName={place.name}
                    mansfield={<MansfieldPackSection pack={mansfieldPack} part="snow" />}
                  />
                ) : (
                  <MansfieldPackSection pack={mansfieldPack} part="snow" />
                )
              }
            </Stream>
            <Stream label="Avalanche weather" data={avg}>
              {(avg) => <AvgForecastSection results={avg ?? []} collapsed />}
            </Stream>
          </>
        ) : null}

        {tab === 'maps' ? (
          <Stream label="Maps" data={maps}>
            {(maps) => (maps ? <MapsSection data={maps} place={place} /> : null)}
          </Stream>
        ) : null}

        {tab === 'more' ? (
          <>
            <Stream label="Sun and moon" data={sky}>
              {(sky) => (
                <div id="sun-moon">
                  <SkySection data={sky} />
                </div>
              )}
            </Stream>
            <PlaceFactsSection place={place} stateName={stateEntry.name} sectionTitle={section.title} />
            <Stream label="Land and access" data={ground}>
              {(ground) => (ground ? <LandAccessSection data={ground} /> : null)}
            </Stream>
            <Suspense
              fallback={<p className="panel px-3.5 py-3 text-meta text-ink-2">Checking every source for this page…</p>}
            >
              <PlaceSources place={place} stateCode={stateCode} sectionId={sectionId} path={path} />
            </Suspense>
            <Stream label="About sources" data={ground}>
              {(ground) => (
                <AboutSourcesSection notes={[...(ground ? groundSourceNotes(ground) : []), USNO_API_TWILIGHT_NOTE]} />
              )}
            </Stream>
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
  return (
    <PageSourcesSection
      sources={{
        ...sources,
        links: sources.links.filter((l) => !landHrefs.has(l.href)),
      }}
      tabHref={tabHref}
    />
  );
}

/**
 * GYX and CAR publish the same recreation text twice: as the REC product and in the
 * allLocations map file. Show the map file only for an office whose REC did not load.
 */
function allLocationsNotInRec(
  allLocations: Awaited<ReturnType<typeof readAllLocationsForPlace>>,
  rec: Awaited<ReturnType<typeof readRecForPlace>>,
) {
  const recOffices = new Set(
    (rec ?? []).filter((r) => r.data && r.status !== 'error').map((r) => r.data!.office as string),
  );
  return (allLocations ?? []).filter((a) => !a.data || !recOffices.has(a.data.office));
}

/** The render callback stays on the server; no source data or functions cross a client boundary. */
function Stream<T>({ label, data, children }: { label: string; data: Promise<T>; children: (data: T) => ReactNode }) {
  return (
    <Suspense fallback={<WeatherLoading label={label} />}>
      <Resolved data={data}>{children}</Resolved>
    </Suspense>
  );
}

async function Resolved<T>({ data, children }: { data: Promise<T>; children: (data: T) => ReactNode }) {
  return children(await data);
}
