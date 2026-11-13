import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import type { RecPlaceSlice } from '@/lib/mountain-weather/rec-types';
import type { SourceResult } from '@/lib/mountain-weather/source-types';
import {
  NWS_REC_ALY_DEF,
  NWS_REC_BTV_DEF,
  NWS_REC_CAR_DEF,
  NWS_REC_GYX_DEF,
} from '@/lib/mountain-weather/registry';

const OFFICE_DEF = {
  BTV: NWS_REC_BTV_DEF,
  ALY: NWS_REC_ALY_DEF,
  GYX: NWS_REC_GYX_DEF,
  CAR: NWS_REC_CAR_DEF,
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

export function RecForecastSection({ result }: { result: SourceResult<RecPlaceSlice> | null }) {
  if (!result) return null;

  const def = result.data ? OFFICE_DEF[result.data.office] : null;
  const stale = result.status === 'stale' ? ' · stale' : '';

  if (result.status === 'error' || !result.data) {
    return (
      <CollapsibleSection
        title="Recreation forecast (REC)"
        subtitle={def ? `${def.org} (unavailable)${stale}` : 'REC unavailable'}
      >
        <p className="text-sm font-bold">{result.error ?? 'Recreation forecast did not load.'}</p>
      </CollapsibleSection>
    );
  }

  const data = result.data;
  const section = data.section;
  const title = section.ellipsisTitle ?? section.theTitle ?? section.zoneHeader ?? data.sectionMatch;

  return (
    <CollapsibleSection
      title="Recreation forecast (REC)"
      subtitle={`${def?.org} · ${title}${data.nearbyLabel ? ` · ${data.nearbyLabel}` : ''}${stale}`}
      defaultOpen
    >
      <div className="space-y-3 text-sm">
        {section.zoneHeader ? <p className="text-xs font-bold uppercase text-gray-700">{section.zoneHeader}</p> : null}
        {section.periods.length > 0 ? (
          <ul className="space-y-2">
            {section.periods.map((period) => (
              <li key={period.name}>
                <p className="font-bold">{period.name}</p>
                <p className="text-gray-900 whitespace-pre-wrap">{period.text}</p>
              </li>
            ))}
          </ul>
        ) : null}
        {section.bands.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-[#5c3a1e]/30 text-xs">
              <thead className="bg-white/70">
                <tr className="text-left uppercase tracking-wide">
                  <th className="px-2 py-1">Period</th>
                  <th className="px-2 py-1">Fields</th>
                </tr>
              </thead>
              <tbody>
                {section.bands.map((band) => (
                  <tr key={band.label} className="border-t border-[#5c3a1e]/15">
                    <td className="whitespace-nowrap px-2 py-1 font-bold">{band.label}</td>
                    <td className="px-2 py-1">
                      <ul>
                        {Object.entries(band.fields).map(([key, value]) => (
                          <li key={key}>
                            <span className="font-bold">{key}:</span> {value ?? '—'}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <p className="text-xs text-gray-700">
          Issued {formatEt(result.issuedAt)} ET ·{' '}
          <a href={result.sourceUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
            NWS REC ({data.office})
          </a>
        </p>
      </div>
    </CollapsibleSection>
  );
}
