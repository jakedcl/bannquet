import { cachedSourceRead, buildSourceResult, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import { parseCompassEssXml } from '@/lib/mountain-weather/parse/compass-c2c';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';
import type { CompassEss } from '@/lib/mountain-weather/parse/compass-c2c';

export type CompassNetwork = 'Maine' | 'NewHampshire' | 'Vermont';

export const COMPASS_NE_ESS_DEF: SourceDef = {
  id: 'compass-ne-ess',
  org: 'New England Compass (511)',
  kind: 'measured',
  terms: 'reuse-ok',
  url: 'https://nec-por.ne-compass.com/NEC.XmlDataPortal/api/c2c',
  ttlSeconds: 600,
  expectedEveryHours: 1,
};

const readers = new Map<CompassNetwork, () => Promise<SourceResult<CompassEss[]>>>();

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
      read: async () =>
        buildSourceResult({
          fetched: await fetchSourceBody(sourceUrl, 15_000),
          parse: parseCompassEssXml,
        }),
    });
    readers.set(network, reader);
  }
  return reader;
}

export function readCompassNeEss(network: CompassNetwork): Promise<SourceResult<CompassEss[]>> {
  return readerFor(network)();
}

export function compassNetworkForState(state: string): CompassNetwork | null {
  if (state === 'nh') return 'NewHampshire';
  if (state === 'vt') return 'Vermont';
  if (state === 'me') return 'Maine';
  return null;
}