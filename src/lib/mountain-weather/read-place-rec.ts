import type { AllLocationsPlaceSlice } from '@/lib/mountain-weather/all-locations-types';
import type { RecOffice, RecPlaceSlice } from '@/lib/mountain-weather/rec-types';
import { matchedRecHeaderLabel, pickRecSectionFromMatches } from '@/lib/mountain-weather/parse/rec';
import { readAllLocationsIndex } from '@/lib/mountain-weather/readers/nws-all-locations';
import { readRecBulletinHistory } from '@/lib/mountain-weather/readers/nws-rec-history';
import {
  NWS_REC_ALY_DEF,
  NWS_REC_BTV_DEF,
  NWS_REC_CAR_DEF,
  NWS_REC_GYX_DEF,
} from '@/lib/mountain-weather/registry';
import {
  sourceBindingForPlace,
  type AllLocationsPlaceBinding,
  type RecPlaceBinding,
} from '@/lib/mountain-weather/source-bindings';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

const OFFICE_DEF: Record<'BTV' | 'ALY' | 'GYX' | 'CAR', SourceDef> = {
  BTV: NWS_REC_BTV_DEF,
  ALY: NWS_REC_ALY_DEF,
  GYX: NWS_REC_GYX_DEF,
  CAR: NWS_REC_CAR_DEF,
};

function recDef(office: RecOffice): SourceDef {
  if (office in OFFICE_DEF) return OFFICE_DEF[office as keyof typeof OFFICE_DEF];
  return {
    id: `nws-${office.toLowerCase()}-rec`,
    org: `National Weather Service ${office}`,
    kind: 'forecast',
    terms: 'reuse-ok',
    url: `https://api.weather.gov/products/types/REC/locations/${office}`,
    ttlSeconds: 1800,
    expectedEveryHours: 6,
  };
}

function asList<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function sectionMatchesFor(binding: RecPlaceBinding): string[] {
  if (binding.sectionMatches?.length) return binding.sectionMatches;
  return [binding.sectionMatch];
}

function resolveRecBinding(
  history: Awaited<ReturnType<typeof readRecBulletinHistory>>,
  binding: RecPlaceBinding,
): SourceResult<RecPlaceSlice> {
  const def = recDef(binding.office);
  if (history.status === 'error' || !history.data?.length) {
    return {
      status: 'error',
      data: null,
      issuedAt: history.issuedAt,
      validFrom: null,
      validTo: null,
      sourceUrl: history.sourceUrl ?? def.url,
      error: history.error,
    };
  }

  const needles = sectionMatchesFor(binding);
  const latestIssuance = history.data[0]?.issuanceTime ?? null;

  for (let i = 0; i < history.data.length; i++) {
    const entry = history.data[i];
    const hit = pickRecSectionFromMatches(entry.bulletin, needles);
    if (!hit) continue;

    const headerLabel = matchedRecHeaderLabel(hit.section, hit.matched);
    return {
      status: history.status,
      data: {
        office: binding.office,
        sectionMatch: needles[0],
        sectionMatches: needles,
        matchedSectionTitle: headerLabel,
        nearbyLabel: binding.nearbyLabel ?? null,
        section: hit.section,
        issuanceTime: entry.issuanceTime,
        productId: entry.productId,
        latestIssuanceTime: latestIssuance,
        notInLatestIssuance: i > 0,
      },
      issuedAt: entry.issuanceTime,
      validFrom: null,
      validTo: null,
      sourceUrl: entry.sourceUrl,
    };
  }

  return {
    status: 'not-in-issuance',
    data: null,
    issuedAt: latestIssuance,
    validFrom: null,
    validTo: null,
    sourceUrl: history.data[0]?.sourceUrl ?? def.url,
  };
}

export async function readRecForPlace(placeId: string): Promise<SourceResult<RecPlaceSlice>[] | null> {
  const list = asList(sourceBindingForPlace(placeId)?.rec);
  if (list.length === 0) return null;

  const byOffice = new Map<RecOffice, RecPlaceBinding[]>();
  for (const b of list) {
    const bucket = byOffice.get(b.office) ?? [];
    bucket.push(b);
    byOffice.set(b.office, bucket);
  }

  const out: SourceResult<RecPlaceSlice>[] = [];

  for (const [office, binds] of byOffice) {
    const def = recDef(office);
    const history = await readRecBulletinHistory(office, def);

    for (const binding of binds) {
      out.push(resolveRecBinding(history, binding));
    }
  }

  return out;
}

export async function readAllLocationsForPlace(
  placeId: string,
): Promise<SourceResult<AllLocationsPlaceSlice>[] | null> {
  const list = asList(sourceBindingForPlace(placeId)?.allLocations);
  if (list.length === 0) return null;

  const byOffice = new Map<AllLocationsPlaceBinding['office'], AllLocationsPlaceBinding[]>();
  for (const b of list) {
    const bucket = byOffice.get(b.office) ?? [];
    bucket.push(b);
    byOffice.set(b.office, bucket);
  }

  const out: SourceResult<AllLocationsPlaceSlice>[] = [];

  for (const [office, binds] of byOffice) {
    const file = await readAllLocationsIndex(office);
    if (file.status === 'error' || !file.data) {
      for (const _bind of binds) {
        out.push({ ...file, data: null });
      }
      continue;
    }

    for (const binding of binds) {
      const marker = file.data[binding.loc] ?? null;
      if (!marker) {
        out.push({
          status: 'not-in-issuance',
          data: null,
          issuedAt: file.issuedAt,
          validFrom: null,
          validTo: null,
          sourceUrl: file.sourceUrl,
        });
        continue;
      }

      const status = marker.seasonalOff ? 'seasonal-off' : file.status;

      out.push({
        status,
        data: {
          office: binding.office,
          loc: binding.loc,
          bandLabel: binding.bandLabel ?? null,
          marker,
        },
        issuedAt: file.issuedAt,
        validFrom: null,
        validTo: null,
        sourceUrl: file.sourceUrl,
      });
    }
  }

  return out;
}