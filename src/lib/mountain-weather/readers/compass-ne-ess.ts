import { cachedSourceRead, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import { parseCompassEssXml, parseClockUtcFromTimestamp } from '@/lib/mountain-weather/parse/compass-c2c';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';
import type { CompassEss } from '@/lib/mountain-weather/parse/compass-c2c';

export type CompassNetwork = 'Maine' | 'NewHampshire' | 'Vermont';

export type CompassEssBundle = {
  stations: CompassEss[];
  fetchAt: string;
  liveConfirmed: boolean;
};

export const COMPASS_NE_ESS_DEF: SourceDef = {
  id: 'compass-ne-ess',
  org: 'New England Compass (511)',
  kind: 'measured',
  terms: 'reuse-ok',
  url: 'https://nec-por.ne-compass.com/NEC.XmlDataPortal/api/c2c',
  ttlSeconds: 600,
  expectedEveryHours: 1,
};

const FUTURE_SLACK_MS = 30 * 60 * 1000;

function compassFeedConfirmed(rows: CompassEss[], fetchAt: Date): boolean {
  const samples = rows.filter((r) => r.timestampRaw).slice(0, 8);
  if (samples.length === 0) return false;
  let compared = 0;
  let utcMatches = 0;
  let offsetMatches = 0;
  for (const row of samples) {
    const raw = row.timestampRaw!;
    const labeled = new Date(raw);
    if (Number.isNaN(labeled.getTime())) continue;
    compared += 1;
    const labeledSkew = labeled.getTime() - fetchAt.getTime();
    const asUtc = parseClockUtcFromTimestamp(raw);
    const utcSkew = asUtc ? asUtc.getTime() - fetchAt.getTime() : Infinity;
    if (Math.abs(utcSkew) <= FUTURE_SLACK_MS) utcMatches += 1;
    if (Math.abs(labeledSkew) <= FUTURE_SLACK_MS) offsetMatches += 1;
  }
  if (compared === 0) return false;
  if (utcMatches >= Math.max(1, Math.ceil(compared * 0.6))) return true;
  if (offsetMatches >= Math.ceil(compared * 0.8)) return true;
  return false;
}

const readers = new Map<CompassNetwork, () => Promise<SourceResult<CompassEssBundle>>>();

function urlFor(network: CompassNetwork) {
  return `${COMPASS_NE_ESS_DEF.url}?networks=${encodeURIComponent(network)}&dataTypes=essData`;
}

function readerFor(network: CompassNetwork) {
  let reader = readers.get(network);
  if (!reader) {
    const sourceUrl = urlFor(network);
    reader = cachedSourceRead({
      cacheKey: ['compass-ess', network],
      def: COMPASS_NE_ESS_DEF,
      read: async (): Promise<SourceResult<CompassEssBundle>> => {
        const fetched = await fetchSourceBody(sourceUrl, 15_000);
        if (!fetched.ok) {
          return {
            status: 'error',
            data: null,
            issuedAt: null,
            validFrom: null,
            validTo: null,
            sourceUrl: fetched.sourceUrl,
            error: fetched.httpStatus ? `Compass feed outage: HTTP ${fetched.httpStatus}` : fetched.error,
          };
        }
        const stations = parseCompassEssXml(fetched.text);
        const fetchAtIso = fetched.fetchedAt ?? new Date().toISOString();
        const fetchAt = new Date(fetchAtIso);
        const liveConfirmed = compassFeedConfirmed(stations, fetchAt);
        return {
          status: 'ok',
          data: { stations, fetchAt: fetchAtIso, liveConfirmed },
          issuedAt: fetchAtIso,
          validFrom: null,
          validTo: null,
          sourceUrl: fetched.sourceUrl,
        };
      },
    });
    readers.set(network, reader);
  }
  return reader;
}

export function readCompassNeEss(network: CompassNetwork): Promise<SourceResult<CompassEssBundle>> {
  return readerFor(network)();
}

export function compassNetworkForState(state: string): CompassNetwork | null {
  if (state === 'nh') return 'NewHampshire';
  if (state === 'vt') return 'Vermont';
  if (state === 'me') return 'Maine';
  return null;
}