import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import { NotInIssuanceNote } from '@/components/mountain-weather/NotInIssuanceNote';
import { SourceErrorNote } from '@/components/mountain-weather/SourceErrorNote';
import { SourceReceipt, shortOrg } from '@/components/mountain-weather/kit';
import { tidyLabel } from '@/lib/mountain-weather/format-display';
import type { BalloonCell, BalloonPlaceSlice, BalloonRow } from '@/lib/mountain-weather/balloon-types';
import { defaultResumeHint } from '@/lib/mountain-weather/parse/seasonal-off';
import { NWS_BTV_BALLOON_DEF } from '@/lib/mountain-weather/registry';
import type { SourceResult } from '@/lib/mountain-weather/source-types';

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

function knotsToMph(kt: number): number {
  return Math.round(kt * 1.15078 * 10) / 10;
}

function formatWindCell(cell: BalloonCell, row: BalloonRow): string {
  if (cell === null) return '—';
  if (row.unit !== 'kt' || typeof cell !== 'number') return String(cell);
  return `${cell} kt (${knotsToMph(cell)} mph)`;
}

function formatCell(cell: BalloonCell, row: BalloonRow): string {
  if (cell === null) return '—';
  if (row.unit === 'kt') return formatWindCell(cell, row);
  return String(cell);
}

export function BalloonForecastSection({ result }: { result: SourceResult<BalloonPlaceSlice> | null }) {
  if (!result) return null;
  const def = NWS_BTV_BALLOON_DEF;

  if (result.status === 'not-in-issuance') {
    return (
      <CollapsibleSection title="Winds aloft" subtitle={`Hot Air Balloon Forecast · ${shortOrg(def.org)} · not in this issue`}>
        <NotInIssuanceNote
          label="Ridge / balloon wind forecast"
          href={result.sourceUrl ?? def.url}
          latestIssuanceEt={formatEt(result.issuedAt)}
        />
        <SourceReceipt org={def.org} product="Hot Air Balloon Forecast" at={result.issuedAt} status={result.status} href={result.sourceUrl ?? def.url} />
      </CollapsibleSection>
    );
  }

  if (result.status === 'error' || !result.data) {
    return (
      <CollapsibleSection title="Winds aloft" subtitle="Hot Air Balloon Forecast (could not load)">
        <SourceErrorNote label="Balloon wind forecast" href={result.sourceUrl ?? def.url} />
        <SourceReceipt org={def.org} product="Hot Air Balloon Forecast" status="error" href={result.sourceUrl ?? def.url} />
      </CollapsibleSection>
    );
  }

  const { region, regionMatch, nearbyLabel, matchedRegionTitle } = result.data;
  const seasonal = result.status === 'seasonal-off';

  return (
    <CollapsibleSection
      title="Winds aloft"
      subtitle={`Ridge and Hot Air Balloon Forecast · ${shortOrg(def.org)} · ${tidyLabel(matchedRegionTitle ?? region.regionTitle)}${nearbyLabel ? ` · ${nearbyLabel}` : ''}${seasonal ? ' · off season' : ''}`}
      defaultOpen={false}
    >
      <div className="space-y-3 text-sm">
        <p className="text-xs text-ink">
          Wind speed and direction above the ground, from the forecast for balloon pilots.{' '}
          <span className="font-bold">Region:</span> {tidyLabel(regionMatch)}
        </p>
        {region.cityLines.map((line) => (
          <p key={line} className="text-xs text-ink whitespace-pre-wrap">
            {line}
          </p>
        ))}
        {region.issuanceLine ? <p className="text-xs font-bold">{region.issuanceLine}</p> : null}

        {seasonal ? (
          <p className="border border-hairline bg-surface p-2 text-xs font-bold">
            {region.seasonalMessage ?? defaultResumeHint('ridge wind')}
            {result.issuedAt ? ` Last update ${formatEt(result.issuedAt)} ET.` : ''}
          </p>
        ) : null}

        {!seasonal && region.rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-hairline text-[11px]">
              <thead className="bg-surface">
                <tr className="text-left">
                  <th className="sticky left-0 bg-white/90 px-2 py-1">Field</th>
                  {(region.estHours.length > 0 ? region.estHours : region.rows[0]?.values.map((_, i) => String(i + 1)) ?? []).map(
                    (h, idx) => (
                      <th key={`${h}-${idx}`} className="px-1 py-1 whitespace-nowrap">
                        {h}
                        {region.utcHours[idx] ? (
                          <span className="block font-normal text-ink-2">UTC {region.utcHours[idx]}</span>
                        ) : null}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {region.rows.map((row) => (
                  <tr key={row.key} className="border-t border-hairline">
                    <td className="sticky left-0 bg-surface-cream px-2 py-0.5 font-bold whitespace-nowrap">{tidyLabel(row.label)}</td>
                    {row.values.map((cell, idx) => (
                      <td key={`${row.key}-${idx}`} className="px-1 py-0.5 text-center">
                        {formatCell(cell, row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {region.sunriseSunsetLines.length > 0 ? (
          <ul className="text-xs">
            {region.sunriseSunsetLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}

        {region.tafLines.length > 0 ? (
          <div>
            <p className="text-xs font-bold uppercase">TAF excerpt</p>
            <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-ink">{region.tafLines.join('\n')}</pre>
          </div>
        ) : null}

        {region.footerLines.map((line) => (
          <p key={line} className="text-[11px] text-ink">
            {line}
          </p>
        ))}

        <p className="text-xs text-ink-2">Wind speeds are issued in knots; mph is worked out (× 1.15).</p>
        <SourceReceipt
          org={def.org}
          product="Hot Air Balloon Forecast"
          at={result.issuedAt}
          status={result.status}
          expectedEveryHours={def.expectedEveryHours}
          href={result.sourceUrl}
        />
      </div>
    </CollapsibleSection>
  );
}
