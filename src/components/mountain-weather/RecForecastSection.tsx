import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import { NotInIssuanceNote } from '@/components/mountain-weather/NotInIssuanceNote';
import { SourceErrorNote } from '@/components/mountain-weather/SourceErrorNote';
import { SourceReceipt, shortOrg } from '@/components/mountain-weather/kit';
import { tidyLabel } from '@/lib/mountain-weather/format-display';
import type { RecPlaceSlice } from '@/lib/mountain-weather/rec-types';
import type { SourceResult } from '@/lib/mountain-weather/source-types';
import type { RecOffice } from '@/lib/mountain-weather/rec-types';
import {
  NWS_REC_ALY_DEF,
  NWS_REC_BTV_DEF,
  NWS_REC_CAR_DEF,
  NWS_REC_GYX_DEF,
} from '@/lib/mountain-weather/registry';
import type { SourceDef } from '@/lib/mountain-weather/source-types';

const OFFICE_DEF: Record<'BTV' | 'ALY' | 'GYX' | 'CAR', SourceDef> = {
  BTV: NWS_REC_BTV_DEF,
  ALY: NWS_REC_ALY_DEF,
  GYX: NWS_REC_GYX_DEF,
  CAR: NWS_REC_CAR_DEF,
};

function recSourceDef(office: RecOffice): SourceDef {
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

/** "Recreation forecast for summits above 4000 feet in ..." -> "Summits above 4000 feet in ...". */
function recArea(title: string | null | undefined): string {
  const t = tidyLabel(title) ?? '';
  const rest = t.replace(/^recreation(al)? forecast for\s+/i, '');
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

const PANEL_TITLE = "Forecaster's mountain forecast";

/** One REC slice. In a group (several elevation bands), titled by its band; alone, by the panel title. */
function RecBlock({ result, inGroup = false }: { result: SourceResult<RecPlaceSlice>; inGroup?: boolean }) {
  const def = result.data ? recSourceDef(result.data.office) : null;

  if (result.status === 'not-in-issuance') {
    return (
      <CollapsibleSection title={PANEL_TITLE} subtitle={`Recreation Forecast (REC) · ${shortOrg(def?.org ?? 'NWS')} · not in this issue`}>
        <NotInIssuanceNote
          label="Recreation forecast (REC)"
          href={result.sourceUrl ?? def?.url ?? 'https://api.weather.gov/'}
          latestIssuanceEt={formatEt(result.issuedAt)}
        />
      </CollapsibleSection>
    );
  }

  if (result.status === 'error' || !result.data) {
    return (
      <CollapsibleSection
        title={PANEL_TITLE}
        subtitle="Recreation Forecast (REC) (could not load)"
      >
        <SourceErrorNote
          label="Recreation forecast (REC)"
          href={result.sourceUrl ?? (def?.url ?? 'https://api.weather.gov/')}
        />
      </CollapsibleSection>
    );
  }

  const data = result.data;
  const section = data.section;
  const title = data.matchedSectionTitle ?? section.theTitle ?? section.ellipsisTitle ?? section.zoneHeader ?? data.sectionMatch;

  return (
    <CollapsibleSection
      title={inGroup ? recArea(title) : PANEL_TITLE}
      subtitle={`Recreation Forecast (REC) · ${shortOrg(def?.org ?? '')}${inGroup ? '' : ` · ${recArea(title)}`}${data.nearbyLabel && !/feet|ft/i.test(title ?? '') ? ` · ${data.nearbyLabel}` : ''}${data.notInLatestIssuance ? ' · earlier issue' : ''}`}
      defaultOpen
    >
      {data.notInLatestIssuance ? (
        <p className="mb-2 text-xs text-ink-2">
          Not in latest bulletin ({formatEt(data.latestIssuanceTime)} ET). Showing{' '}
          {formatEt(result.issuedAt)} ET instead.
        </p>
      ) : null}
      <div className="space-y-3 text-sm">
        {section.periods.length > 0 ? (
          <ul className="space-y-2">
            {section.periods.map((period) => (
              <li key={period.name}>
                <p className="font-bold">{period.name}</p>
                {/* Bulletins wrap at 66 columns; join those lines so the text reflows on a phone. */}
                <p className="text-ink">{period.text.replace(/\s*\n\s*/g, ' ')}</p>
              </li>
            ))}
          </ul>
        ) : null}
        {section.bands.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-hairline text-xs">
              <thead className="bg-surface">
                <tr className="text-left uppercase tracking-wide">
                  <th className="px-2 py-1">Period</th>
                  <th className="px-2 py-1">Fields</th>
                </tr>
              </thead>
              <tbody>
                {section.bands.map((band) => (
                  <tr key={band.label} className="border-t border-hairline">
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
        <SourceReceipt
          org={def?.org ?? `National Weather Service ${data.office}`}
          product="Recreation Forecast (REC)"
          at={result.issuedAt}
          status={result.status}
          expectedEveryHours={def?.expectedEveryHours}
          href={result.sourceUrl}
        />
      </div>
    </CollapsibleSection>
  );
}

export function RecForecastSection({ results }: { results: SourceResult<RecPlaceSlice>[] | null }) {
  if (!results || results.length === 0) return null;
  if (results.length === 1) return <RecBlock result={results[0]} />;
  // Several elevation bands (GYX summits and 2,500-4,000 ft): one panel, one block per band.
  const org = results.find((r) => r.data)?.data;
  return (
    <CollapsibleSection
      title={PANEL_TITLE}
      subtitle={`Recreation Forecast (REC)${org ? ` · ${shortOrg(recSourceDef(org.office).org)}` : ''} · ${results.length} elevation bands`}
    >
      <div className="space-y-2">
        {results.map((result, idx) => (
          <RecBlock key={`${result.data?.sectionMatch ?? 'err'}-${idx}`} result={result} inGroup />
        ))}
      </div>
    </CollapsibleSection>
  );
}
