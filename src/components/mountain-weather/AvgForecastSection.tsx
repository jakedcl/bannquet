import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import { SourceReceipt, shortOrg } from '@/components/mountain-weather/kit';
import { tidyLabel } from '@/lib/mountain-weather/format-display';
import { SourceErrorNote } from '@/components/mountain-weather/SourceErrorNote';
import type { AvgCell, AvgDateGrid, AvgPlaceSlice } from '@/lib/mountain-weather/avg-types';
import { defaultResumeHint } from '@/lib/mountain-weather/parse/seasonal-off';
import { NWS_AVG_BTV_DEF, NWS_AVG_GYX_DEF } from '@/lib/mountain-weather/registry';
import type { SourceResult } from '@/lib/mountain-weather/source-types';

const OFFICE_DEF = {
  BTV: NWS_AVG_BTV_DEF,
  GYX: NWS_AVG_GYX_DEF,
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

function formatCell(value: AvgCell): string {
  if (value === null) return '—';
  if (value === 'T') return 'T';
  return String(value);
}

function AvgGridTable({ grid, gridIndex }: { grid: AvgDateGrid; gridIndex: number }) {
  const columnLabels =
    grid.timeLabels.length > 0
      ? grid.timeLabels
      : grid.rows[0]?.values.map((_, i) => String(i + 1)) ?? [];

  return (
    <div className="space-y-1">
      {grid.dateHeading ? (
        <p className="text-xs font-bold text-ink">{tidyLabel(grid.dateHeading.replace(/^DATE\s+/i, ''))}</p>
      ) : (
        <p className="text-xs font-bold text-ink">Period {gridIndex + 1}</p>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-hairline text-[11px]">
          <thead className="bg-surface">
            <tr>
              <th className="sticky left-0 bg-white/90 px-2 py-1 text-left">Field</th>
              {columnLabels.map((label, idx) => (
                <th key={`${label}-${idx}`} className="whitespace-nowrap px-1 py-1 text-center font-bold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row) => (
              <tr key={`${gridIndex}-${row.key}-${row.label}`} className="border-t border-hairline">
                <td className="sticky left-0 bg-white/95 px-2 py-1 font-bold whitespace-nowrap">{tidyLabel(row.label)}</td>
                {row.values.map((cell, idx) => (
                  <td key={idx} className="px-1 py-1 text-center">
                    {formatCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** What the AVG codes and rows mean; the table itself keeps the forecaster's codes. */
function AvgLegend() {
  return (
    <dl className="grid gap-1 text-caption text-ink-2 sm:grid-cols-2">
      <div>
        <dt className="inline font-bold">Cloud cover codes: </dt>
        <dd className="inline">CL clear · FW few · SC scattered · BK broken (mostly cloudy) · OV overcast</dd>
      </div>
      <div>
        <dt className="inline font-bold">6-hour rows: </dt>
        <dd className="inline">totals for the 6 hours ending at that column</dd>
      </div>
      <div>
        <dt className="inline font-bold">Snow level: </dt>
        <dd className="inline">rain turns to snow above this height, in thousands of feet</dd>
      </div>
      <div>
        <dt className="inline font-bold">Snow ratio and density: </dt>
        <dd className="inline">inches of snow per inch of water (10:1 is typical; higher is fluffier), and water as a share of new snow</dd>
      </div>
    </dl>
  );
}

function AvgBlock({ result }: { result: SourceResult<AvgPlaceSlice> }) {
  const def = result.data ? OFFICE_DEF[result.data.office] : null;
  const seasonal = result.status === 'seasonal-off';

  if (result.status === 'error' || !result.data) {
    return (
      <CollapsibleSection
        title="Avalanche weather, hour by hour"
        subtitle="Avalanche Weather Guidance (AVG) (could not load)"
      >
        <SourceErrorNote label="AVG recreation points" href={result.sourceUrl ?? def?.url ?? 'https://www.weather.gov/'} />
      </CollapsibleSection>
    );
  }

  const data = result.data;
  const elev =
    data.elevationNote ??
    (data.point.elevationFt !== null ? `${data.point.elevationFt.toLocaleString('en-US')} ft` : null);

  return (
    <CollapsibleSection
      title="Avalanche weather, hour by hour"
      subtitle={`Avalanche Weather Guidance (AVG) · ${shortOrg(def?.org ?? '')} · ${tidyLabel(data.point.title)}${elev && !/\bft\b/i.test(data.point.title) ? ` · ${elev}` : ''}${data.nearbyLabel ? ` · ${data.nearbyLabel}` : ''}${seasonal ? ' · off season' : ''}`}
      defaultOpen={!seasonal}
    >
      <div className="space-y-3 text-sm">
        {seasonal ? (
          <p className="border border-hairline bg-surface p-2 text-xs font-bold">
            {defaultResumeHint('AVG')}
            {result.issuedAt ? ` Last issued ${formatEt(result.issuedAt)} ET.` : ''}
            {data.seasonalMessage ? ` ${data.seasonalMessage}` : null}
          </p>
        ) : (
          <>
            {data.point.grids.map((grid, idx) => <AvgGridTable key={idx} grid={grid} gridIndex={idx} />)}
            <AvgLegend />
          </>
        )}
        <SourceReceipt
          org={def?.org ?? `National Weather Service ${data.office}`}
          product="Avalanche Weather Guidance (AVG)"
          at={result.issuedAt}
          status={result.status}
          expectedEveryHours={def?.expectedEveryHours}
          href={result.sourceUrl}
        />
      </div>
    </CollapsibleSection>
  );
}

export function AvgForecastSection({ results }: { results: SourceResult<AvgPlaceSlice>[] | null }) {
  if (!results || results.length === 0) return null;
  return (
    <>
      {results.map((result, idx) => (
        <AvgBlock key={`${result.data?.pointMatch ?? 'err'}-${idx}`} result={result} />
      ))}
    </>
  );
}
