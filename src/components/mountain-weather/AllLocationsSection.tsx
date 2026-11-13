import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import type { AllLocationsPlaceSlice } from '@/lib/mountain-weather/all-locations-types';
import { defaultResumeHint } from '@/lib/mountain-weather/parse/seasonal-off';
import {
  NWS_ALL_LOCATIONS_CAR_DEF,
  NWS_ALL_LOCATIONS_GYX_DEF,
} from '@/lib/mountain-weather/registry';
import type { SourceResult } from '@/lib/mountain-weather/source-types';

const OFFICE_DEF = {
  GYX: NWS_ALL_LOCATIONS_GYX_DEF,
  CAR: NWS_ALL_LOCATIONS_CAR_DEF,
} as const;

function formatEt(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function AllLocationsSection({ result }: { result: SourceResult<AllLocationsPlaceSlice> | null }) {
  if (!result) return null;

  const def = result.data ? OFFICE_DEF[result.data.office] : null;
  const stale = result.status === 'stale' ? ' · stale' : '';
  const seasonal = result.status === 'seasonal-off';

  if (result.status === 'error' || !result.data) {
    return (
      <CollapsibleSection
        title="allLocations narrative"
        subtitle={def ? `${def.org} (unavailable)${stale}` : 'allLocations unavailable'}
      >
        <p className="text-sm font-bold">{result.error ?? 'allLocations did not load.'}</p>
      </CollapsibleSection>
    );
  }

  const { marker, loc } = result.data;

  return (
    <CollapsibleSection
      title="allLocations narrative"
      subtitle={`${def?.org} · ${loc}${marker.type ? ` · ${marker.type}` : ''}${seasonal ? ' · off season' : ''}${stale}`}
      defaultOpen={!seasonal}
    >
      <div className="space-y-2 text-sm">
        {seasonal ? (
          <p className="border border-[#5c3a1e]/30 bg-white/60 p-2 text-xs font-bold">
            {defaultResumeHint(marker.type)}
            {result.issuedAt ? ` Last file update ${formatEt(result.issuedAt)} ET.` : ''}
            {marker.seasonalMessage ? ` ${marker.seasonalMessage}` : null}
          </p>
        ) : (
          <p className="whitespace-pre-wrap text-gray-900">{marker.narrative || '—'}</p>
        )}
        <p className="text-xs text-gray-700">
          {marker.lat !== null && marker.lon !== null
            ? `NWS point ${marker.lat}, ${marker.lon} · `
            : null}
          <a href={result.sourceUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
            {def?.url}
          </a>
          {result.issuedAt ? ` · Last-Modified ${formatEt(result.issuedAt)} ET` : null}
        </p>
      </div>
    </CollapsibleSection>
  );
}
