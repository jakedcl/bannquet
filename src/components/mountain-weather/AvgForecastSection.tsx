import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
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
        <p className="text-xs font-bold uppercase tracking-wide text-gray-800">{grid.dateHeading}</p>
      ) : (
        <p className="text-xs font-bold text-gray-800">Period {gridIndex + 1}</p>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full border border-[#5c3a1e]/30 text-[11px]">
          <thead className="bg-white/70">
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
              <tr key={`${gridIndex}-${row.key}-${row.label}`} className="border-t border-[#5c3a1e]/15">
                <td className="sticky left-0 bg-white/95 px-2 py-1 font-bold whitespace-nowrap">{row.label}</td>
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

function AvgBlock({ result }: { result: SourceResult<AvgPlaceSlice> }) {
  const def = result.data ? OFFICE_DEF[result.data.office] : null;
  const stale = result.status === 'stale' ? ' · stale' : '';
  const seasonal = result.status === 'seasonal-off';

  if (result.status === 'error' || !result.data) {
    return (
      <CollapsibleSection
        title="Avalanche weather guidance (AVG)"
        subtitle={def ? `${def.org} (unavailable)${stale}` : 'AVG unavailable'}
      >
        <p className="text-sm font-bold">{result.error ?? 'AVG did not load.'}</p>
      </CollapsibleSection>
    );
  }

  const data = result.data;
  const elev =
    data.elevationNote ??
    (data.point.elevationFt !== null ? `${data.point.elevationFt.toLocaleString('en-US')} ft (AVG point)` : null);

  return (
    <CollapsibleSection
      title="Avalanche weather guidance (AVG)"
      subtitle={`${def?.org} · ${data.point.title}${elev ? ` · ${elev}` : ''}${data.nearbyLabel ? ` · ${data.nearbyLabel}` : ''}${seasonal ? ' · off season' : ''}${stale}`}
      defaultOpen={!seasonal}
    >
      <div className="space-y-3 text-sm">
        {seasonal ? (
          <p className="border border-[#5c3a1e]/30 bg-white/60 p-2 text-xs font-bold">
            {defaultResumeHint('AVG')}
            {result.issuedAt ? ` Last issued ${formatEt(result.issuedAt)} ET.` : ''}
            {data.seasonalMessage ? ` ${data.seasonalMessage}` : null}
          </p>
        ) : (
          data.point.grids.map((grid, idx) => <AvgGridTable key={idx} grid={grid} gridIndex={idx} />)
        )}
        <p className="text-xs text-gray-700">
          Issued {formatEt(result.issuedAt)} ET ·{' '}
          <a href={result.sourceUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
            NWS AVG ({data.office})
          </a>
        </p>
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
