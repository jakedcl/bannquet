import { cachedSourceRead } from '@/lib/mountain-weather/fetch-source';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';
import { outsideFetch } from '@/lib/outside-fetch';

export type AscrWhitefaceTimelapse = {
  mp4Url: string;
  dashboardUrl: string;
  dataFeedStatus: 'unavailable' | 'ok';
  dataFeedNote: string | null;
};

export const ASRC_WHITEFACE_TIMELAPSE_DEF: SourceDef = {
  id: 'uasrc-whiteface-timelapse',
  org: 'University at Albany ASRC',
  kind: 'measured',
  terms: 'reuse-ok',
  url: 'https://research.asrc.albany.edu/wfm_summit_cam/today/wfmstl_today.mp4',
  ttlSeconds: 600,
  expectedEveryHours: 1,
};

const DASHBOARD_URL = 'https://whiteface.asrc.albany.edu/';
const DATA_FEED_NOTE =
  'Numeric WFMS feeds (wsgi-apps.asrc.albany.edu and api.asrc.albany.edu:3000/wfmsapi) were unavailable when checked for M10; timelapse still served from research.asrc.albany.edu.';

async function load(): Promise<SourceResult<AscrWhitefaceTimelapse>> {
  const def = ASRC_WHITEFACE_TIMELAPSE_DEF;
  try {
    const res = await outsideFetch(def.url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Bannquet-Weather-App (admin@bannquet.com)' },
      next: { revalidate: 0 },
    });
    const issuedAt = res.headers.get('last-modified');
    if (!res.ok) {
      return {
        status: 'error',
        data: null,
        issuedAt,
        validFrom: null,
        validTo: null,
        sourceUrl: def.url,
        error: `Timelapse HEAD HTTP ${res.status}`,
      };
    }
    return {
      status: 'ok',
      data: {
        mp4Url: def.url,
        dashboardUrl: DASHBOARD_URL,
        dataFeedStatus: 'unavailable',
        dataFeedNote: DATA_FEED_NOTE,
      },
      issuedAt,
      validFrom: null,
      validTo: null,
      sourceUrl: def.url,
    };
  } catch (err) {
    return {
      status: 'error',
      data: null,
      issuedAt: null,
      validFrom: null,
      validTo: null,
      sourceUrl: def.url,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

const readCached = cachedSourceRead({
  cacheKey: [ASRC_WHITEFACE_TIMELAPSE_DEF.id],
  def: ASRC_WHITEFACE_TIMELAPSE_DEF,
  read: load,
});

export function readAscrWhitefaceTimelapse(): Promise<SourceResult<AscrWhitefaceTimelapse>> {
  return readCached();
}