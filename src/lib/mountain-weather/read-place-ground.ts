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

export const GROUND_ACCESS_NOTES = {
  fire: 'NY places link to the DEC fire-danger map; other states link to WFAS national maps. We do not infer point fire-danger ratings without an official station feed.',
  baxter: 'Baxter conditions are a Google Doc on the park site — link only, not parsed.',
  dec: 'NY DEC trail pages block scripted access (403); links only.',
  compassCameras:
    'Compass cctvSnapshotData has no latitude/longitude in the public C2C feed, so nearest cameras are not bound by distance; use state 511 links.',
  airnow: 'Air quality data needs an AirNow key (AIRNOW_API_KEY). Without it we show only a link to airnow.gov.',
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
  const fetchAt = new Date(bundle.data.fetchAt);
  const ranked = bundle.data.stations
    .map((row) => ({ row, distanceMi: milesBetween(lat, lon, row.lat, row.lon) }))
    .filter((x) => x.distanceMi <= COMPASS_MAX_MI)
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

  const airQualityNote = process.env.AIRNOW_API_KEY?.trim()
    ? 'AirNow current observation when the API key is configured.'
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
  };
}