import { allMountainPlaces } from '@/lib/mountain-weather/places';
import type { MountainPlace } from '@/lib/mountain-weather/places';
import { hubGlanceFromBaseline } from '@/lib/mountain-weather/hub-glance';
import { readNwsGridBaseline } from '@/lib/mountain-weather/readers/nws-grid-baseline';
import { readNwsRidgeNeMosaic, readNwsRidgeSiteLoop } from '@/lib/mountain-weather/readers/nws-ridge-radar';
import { readGoes19NeGeocolor, readGoes19NeGlm } from '@/lib/mountain-weather/readers/goes-19-ne';
import { readNwsAlertsActiveNe } from '@/lib/mountain-weather/readers/nws-alerts-active-ne';
import type { MapsHubData, OutlookLink, PlaceMapPin, PlaceMapsData } from '@/lib/mountain-weather/map-types';
import { mountainWeatherPath, type MountainStateCode } from '@/lib/mountain-weather/slugs';
import { radarSiteForOffice } from '@/lib/mountain-weather/radar-sites';

const POOL = 4;

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]);
    }
  }
  const workers = Math.min(limit, items.length);
  if (workers === 0) return results;
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

export const MAP_OUTLOOK_LINKS: OutlookLink[] = [
  {
    id: 'spc-outlook',
    label: 'Storm Prediction Center convective outlooks',
    href: 'https://www.spc.noaa.gov/products/outlook/',
    org: 'SPC',
  },
  {
    id: 'spc-day1',
    label: 'SPC Day 1 categorical outlook (image)',
    href: 'https://www.spc.noaa.gov/products/outlook/day1otlk.gif',
    org: 'SPC',
  },
  {
    id: 'cpc-610',
    label: 'CPC 6–10 day temperature/precip outlooks',
    href: 'https://www.cpc.ncep.noaa.gov/products/predictions/610day/',
    org: 'CPC',
  },
  {
    id: 'cpc-814',
    label: 'CPC 8–14 day outlooks',
    href: 'https://www.cpc.ncep.noaa.gov/products/predictions/814day/',
    org: 'CPC',
  },
];

export const NWS_ALERTS_MAP_URL = 'https://www.weather.gov/warnings/?warnings=active';

function assetFromResult(result: Awaited<ReturnType<typeof readNwsRidgeNeMosaic>>) {
  return result.status === 'ok' && result.data ? result.data : null;
}

async function loadPlacePin(
  place: MountainPlace & { state: ReturnType<typeof allMountainPlaces>[number]['state']; sectionId: string },
  now: Date,
): Promise<PlaceMapPin> {
  const href = mountainWeatherPath(place.state, place.sectionId, place.id);
  const baseline = await readNwsGridBaseline(place);
  const glance = hubGlanceFromBaseline(baseline, { title: place.name, href }, now);
  return {
    ...glance,
    placeId: place.id,
    lat: place.lat,
    lon: place.lon,
  };
}

async function loadSharedLayers(place?: MountainPlace | null): Promise<Omit<PlaceMapsData, 'pins'>> {
  const siteId = place ? radarSiteForOffice(place.office) : null;
  const [mosaic, site, goes, glm, alerts] = await Promise.all([
    readNwsRidgeNeMosaic(),
    siteId ? readNwsRidgeSiteLoop(siteId) : Promise.resolve(null),
    readGoes19NeGeocolor(),
    readGoes19NeGlm(),
    readNwsAlertsActiveNe(),
  ]);

  return {
    radarMosaic: assetFromResult(mosaic),
    radarSite: site && site.status === 'ok' && site.data ? site.data : null,
    radarSiteId: siteId,
    goesColor: assetFromResult(goes),
    goesGlm: assetFromResult(glm),
    alerts,
    outlooks: MAP_OUTLOOK_LINKS,
  };
}

export async function readPlaceMaps(
  place: MountainPlace,
  meta?: { state: MountainStateCode; sectionId: string },
): Promise<PlaceMapsData> {
  const shared = await loadSharedLayers(place);
  if (!meta) return { ...shared };
  const pin = await loadPlacePin({ ...place, state: meta.state, sectionId: meta.sectionId }, new Date());
  return { ...shared, pins: [pin] };
}

export async function readMapsHub(now = new Date()): Promise<MapsHubData> {
  const places = allMountainPlaces();
  const [shared, pins] = await Promise.all([
    loadSharedLayers(null),
    mapPool(places, POOL, (place) => loadPlacePin(place, now)),
  ]);
  return { ...shared, pins };
}