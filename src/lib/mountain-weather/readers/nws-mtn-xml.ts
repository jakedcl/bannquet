import { cachedSourceRead, buildSourceResult, fetchSourceBody } from '@/lib/mountain-weather/fetch-source';
import { freshnessFromIssued, mergeFreshness } from '@/lib/mountain-weather/freshness';
import type { MtnEnhancedPoint, MtnOffice, MtnStandardPoint } from '@/lib/mountain-weather/mtn-point-types';
import { parseMtnEnhancedXml, parseMtnStandardXml } from '@/lib/mountain-weather/parse/mtn-xml';
import {
  NWS_MTN_ALY_ENHANCED_DEF,
  NWS_MTN_ALY_STANDARD_DEF,
  NWS_MTN_BTV_ENHANCED_DEF,
  NWS_MTN_BTV_STANDARD_DEF,
} from '@/lib/mountain-weather/registry';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

const TTL_DEFS: Record<string, SourceDef> = {
  'nws-btv-mtn-standard': NWS_MTN_BTV_STANDARD_DEF,
  'nws-btv-mtn-enhanced': NWS_MTN_BTV_ENHANCED_DEF,
  'nws-aly-mtn-standard': NWS_MTN_ALY_STANDARD_DEF,
  'nws-aly-mtn-enhanced': NWS_MTN_ALY_ENHANCED_DEF,
};

async function loadFile<T>(
  defId: keyof typeof TTL_DEFS,
  url: string,
  parse: (text: string) => T,
): Promise<SourceResult<T>> {
  const def = TTL_DEFS[defId];
  const fetched = await fetchSourceBody(url);
  const base = buildSourceResult({
    fetched,
    parse,
    issuedAt: fetched.ok ? fetched.issuedAt : null,
  });
  if (base.status === 'error' || !base.data) return base;
  return mergeFreshness(freshnessFromIssued(base.issuedAt, def.expectedEveryHours), base);
}

function cachedMtnFile<T>(
  def: SourceDef,
  parse: (text: string) => T,
): () => Promise<SourceResult<T>> {
  return cachedSourceRead({
    cacheKey: [def.id, def.url],
    def,
    read: () => loadFile(def.id as keyof typeof TTL_DEFS, def.url, parse),
  });
}

const readBtvStandardFile = cachedMtnFile(NWS_MTN_BTV_STANDARD_DEF, parseMtnStandardXml);
const readBtvEnhancedFile = cachedMtnFile(NWS_MTN_BTV_ENHANCED_DEF, (text) => parseMtnEnhancedXml(text, 'BTV'));
const readAlyStandardFile = cachedMtnFile(NWS_MTN_ALY_STANDARD_DEF, parseMtnStandardXml);
const readAlyEnhancedFile = cachedMtnFile(NWS_MTN_ALY_ENHANCED_DEF, (text) => parseMtnEnhancedXml(text, 'ALY'));

export async function readMtnStandardIndex(office: MtnOffice): Promise<SourceResult<Record<string, MtnStandardPoint>>> {
  return office === 'BTV' ? readBtvStandardFile() : readAlyStandardFile();
}

export async function readMtnEnhancedIndex(office: MtnOffice): Promise<SourceResult<Record<string, MtnEnhancedPoint>>> {
  return office === 'BTV' ? readBtvEnhancedFile() : readAlyEnhancedFile();
}
