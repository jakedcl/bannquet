import type { MountainPlace } from '@/lib/mountain-weather/places';
import type { MountainStateCode } from '@/lib/mountain-weather/slugs';
import { groundLinksForPlace } from '@/lib/mountain-weather/ground-access-links';
import type { PlaceGroundData, CompassEssRow } from '@/lib/mountain-weather/ground-access-types';
import type { SourceResult } from '@/lib/mountain-weather/source-types';
import { countyFipsForPlace } from '@/lib/mountain-weather/place-county-fips';
import { readUsdmCountyDrought } from '@/lib/mountain-weather/readers/usdm-county-drought';
import { compassNetworkForState, readCompassNeEss } from '@/lib/mountain-weather/readers/compass-ne-ess';
import { resolveCompassTimestamp } from '@/lib/mountain-weather/parse/compass-c2c';
import { milesBetween } from '@/lib/mountain-weather/geo-miles';
import { readAirNowCurrent } from '@/lib/mountain-weather/readers/airnow-aqi';

const COMPASS_MAX_MI = 75;
const DISTANT_MI = 25;

/** Shown in the place page's "About these sources" panel. Plain words. */
export const GROUND_ACCESS_NOTES = {
  fire: 'Fire danger: New York places link to the DEC fire-danger map and other states to the national WFAS maps. Bannquet does not estimate fire danger for a single point.',
  baxter: 'Baxter State Park posts trail conditions as a Google Doc, so it is a link only.',
  dec: 'New York DEC trail pages cannot be read automatically, so they are links only.',
  compassCameras:
    'Road cameras are not matched to places by distance because the camera feed has no locations. Use the state 511 links instead.',
  airnow:
    'Air quality comes from the nearest AirNow monitors over the last two hours. Without an AirNow key the page links to airnow.gov instead.',
} as const;

function emptyCompass(): SourceResult<CompassEssRow | null> {
  return {
    status: 'ok',
    data: null,
    issuedAt: null,
    validFrom: null,
    validTo: null,
    sourceUrl: 'https://nec-por.ne-compass.com/NEC.XmlDataPortal/api/c2c',
  };
}

const COMPASS_MAX_AGE_HOURS = 6;

async function nearestCompassEss(
  lat: number,
  lon: number,
  state: MountainStateCode,
): Promise<SourceResult<CompassEssRow | null>> {
  const network = compassNetworkForState(state);
  if (!network) return emptyCompass();
  const bundle = await readCompassNeEss(network);
  if (bundle.status === 'error') {
    return { ...bundle, data: null };
  }
  if (!bundle.data?.stations.length) {
    return {
      status: 'ok',
      data: null,
      issuedAt: bundle.issuedAt,
      validFrom: null,
      validTo: null,
      sourceUrl: bundle.sourceUrl,
    };
  }
  const data = bundle.data;
  const fetchAt = new Date(data.fetchAt);
  const ranked = data.stations
    .map((row) => ({ row, distanceMi: milesBetween(lat, lon, row.lat, row.lon) }))
    .filter((x) => x.distanceMi <= COMPASS_MAX_MI)
    .filter((x) => {
      const name = (x.row.name ?? '').trim();
      if (/^crew\s+\d+/i.test(name)) return false;
      // A road station that hasn't reported in 6 hours is not "nearest conditions" (Mansfield's
      // nearest had last reported in March and rendered as a row of dashes).
      const ts = resolveCompassTimestamp(x.row.timestampRaw, fetchAt, data.liveConfirmed);
      const ageHours = ts.instant != null ? (fetchAt.getTime() - ts.instant.getTime()) / (60 * 60 * 1000) : Infinity;
      if (ageHours > COMPASS_MAX_AGE_HOURS) return false;
      return true;
    })
    .sort((a, b) => a.distanceMi - b.distanceMi);
  const best = ranked[0];
  if (!best) {
    return {
      status: 'ok',
      data: null,
      issuedAt: bundle.issuedAt,
      validFrom: null,
      validTo: null,
      sourceUrl: bundle.sourceUrl,
    };
  }
  const ts = resolveCompassTimestamp(best.row.timestampRaw, fetchAt, bundle.data.liveConfirmed);
  return {
    status: 'ok',
    data: {
      id: best.row.id,
      name: best.row.name,
      lat: best.row.lat,
      lon: best.row.lon,
      distanceMi: Math.round(best.distanceMi * 10) / 10,
      distant: best.distanceMi > DISTANT_MI,
      roadSurfaceCond: best.row.roadSurfaceCond,
      precipType: best.row.precipType,
      airTempF: best.row.airTempF,
      pavementTempF: best.row.pavementTempF,
      windSpeed: best.row.windSpeed,
      windDir: best.row.windDir,
      fields: best.row.fields,
      observedAt: ts.instant?.toISOString() ?? null,
      observedAtEt: ts.etLabel,
      timestampInterpretation: ts.interpretation,
      timestampNote: ts.note,
      sourceUrl: bundle.sourceUrl,
    },
    issuedAt: bundle.issuedAt,
    validFrom: null,
    validTo: null,
    sourceUrl: bundle.sourceUrl,
  };
}

export async function readPlaceGround(
  place: MountainPlace,
  state: MountainStateCode,
  sectionId: string,
): Promise<PlaceGroundData> {
  const landLinks = groundLinksForPlace(state, sectionId, place);
  const fips = countyFipsForPlace(place.id);
  const drought = fips ? await readUsdmCountyDrought(fips) : {
    status: 'ok' as const,
    data: null,
    issuedAt: null,
    validFrom: null,
    validTo: null,
    sourceUrl: 'https://usdmdataservices.unl.edu/',
  };
  const [compassEss, airNow] = await Promise.all([
    nearestCompassEss(place.lat, place.lon, state),
    readAirNowCurrent(place.lat, place.lon),
  ]);

  const airNowKeyConfigured = Boolean(process.env.AIRNOW_API_KEY?.trim());
  const airQualityNote = airNowKeyConfigured
    ? 'AirNow PM2.5 and ozone from the nearest regional monitors (distant when over 25 mi).'
    : GROUND_ACCESS_NOTES.airnow;

  return {
    landLinks,
    drought,
    compassEss,
    compassCamera: {
      status: 'ok',
      data: null,
      issuedAt: null,
      validFrom: null,
      validTo: null,
      sourceUrl: 'https://nec-por.ne-compass.com/',
    },
    airNow,
    airQualityNote,
    airNowLink: 'https://www.airnow.gov/',
    airNowKeyConfigured,
  };
}