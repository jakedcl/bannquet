import { cachedSourceRead, buildSourceResult, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import { freshnessFromIssued, mergeFreshness } from '@/lib/mountain-weather/freshness';
import { parseAllLocationsXml } from '@/lib/mountain-weather/parse/all-locations';
import type { AllLocationsMarker, AllLocationsOffice } from '@/lib/mountain-weather/all-locations-types';
import { NWS_ALL_LOCATIONS_CAR_DEF, NWS_ALL_LOCATIONS_GYX_DEF } from '@/lib/mountain-weather/registry';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

const DEFS: Record<AllLocationsOffice, SourceDef> = {
  GYX: NWS_ALL_LOCATIONS_GYX_DEF,
  CAR: NWS_ALL_LOCATIONS_CAR_DEF,
};

async function loadAllLocations(office: AllLocationsOffice): Promise<SourceResult<Record<string, AllLocationsMarker>>> {
  const def = DEFS[office];
  const fetched = await fetchSourceBody(def.url);
  const base = buildSourceResult({
    fetched,
    parse: parseAllLocationsXml,
    issuedAt: fetched.ok ? fetched.issuedAt : null,
  });
  if (base.status === 'error' || !base.data) return base;
  return mergeFreshness(freshnessFromIssued(base.issuedAt, def.expectedEveryHours), base);
}

const readers = new Map<AllLocationsOffice, () => Promise<SourceResult<Record<string, AllLocationsMarker>>>>();

export async function readAllLocationsIndex(
  office: AllLocationsOffice,
): Promise<SourceResult<Record<string, AllLocationsMarker>>> {
  let reader = readers.get(office);
  if (!reader) {
    const def = DEFS[office];
    reader = cachedSourceRead({
      cacheKey: [def.id, office],
      def,
      read: () => loadAllLocations(office),
    });
    readers.set(office, reader);
  }
  return reader();
}
