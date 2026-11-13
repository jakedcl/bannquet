import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
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
  const stale = result.status === 'stale' ? ' · stale' : '';

  if (result.status === 'error' || !result.data) {
    return (
      <CollapsibleSection title="Ridge / balloon wind forecast" subtitle={`${def.org} (unavailable)${stale}`}>
        <p className="text-sm font-bold">{result.error ?? 'Balloon forecast did not load.'}</p>
        <p className="text-xs text-gray-700">
          {def.org} · {def.kind} ·{' '}
          <a href={result.sourceUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
            Source
          </a>
        </p>
      </CollapsibleSection>
    );
  }

  const { region, regionMatch, nearbyLabel } = result.data;
  const seasonal = result.status === 'seasonal-off';

  return (
    <CollapsibleSection
      title="Ridge / balloon wind forecast"
      subtitle={`${def.org} · ${region.regionTitle}${nearbyLabel ? ` · ${nearbyLabel}` : ''}${seasonal ? ' · off season' : ''}${stale}`}
      defaultOpen={!seasonal}
    >
      <div className="space-y-3 text-sm">
        {region.productLines.map((line) => (
          <p key={line} className="text-xs font-bold uppercase text-gray-800">
            {line}
          </p>
        ))}
        <p className="text-xs text-gray-800">
          <span className="font-bold">Region binding:</span> {regionMatch}
        </p>
        {region.cityLines.map((line) => (
          <p key={line} className="text-xs text-gray-800 whitespace-pre-wrap">
            {line}
          </p>
        ))}
        {region.issuanceLine ? <p className="text-xs font-bold">{region.issuanceLine}</p> : null}

        {seasonal ? (
          <p className="border border-[#5c3a1e]/30 bg-white/60 p-2 text-xs font-bold">
            {region.seasonalMessage ?? defaultResumeHint('ridge wind')}
            {result.issuedAt ? ` Last update ${formatEt(result.issuedAt)} ET.` : ''}
          </p>
        ) : null}

        {!seasonal && region.rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-[#5c3a1e]/30 text-[11px]">
              <thead className="bg-white/70">
                <tr className="text-left">
                  <th className="sticky left-0 bg-white/90 px-2 py-1">Field</th>
                  {(region.estHours.length > 0 ? region.estHours : region.rows[0]?.values.map((_, i) => String(i + 1)) ?? []).map(
                    (h, idx) => (
                      <th key={`${h}-${idx}`} className="px-1 py-1 whitespace-nowrap">
                        {h}
                        {region.utcHours[idx] ? (
                          <span className="block font-normal text-gray-600">UTC {region.utcHours[idx]}</span>
                        ) : null}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {region.rows.map((row) => (
                  <tr key={row.key} className="border-t border-[#5c3a1e]/15">
                    <td className="sticky left-0 bg-[#f4e8d4]/95 px-2 py-0.5 font-bold whitespace-nowrap">{row.label}</td>
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
            <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-gray-900">{region.tafLines.join('\n')}</pre>
          </div>
        ) : null}

        {region.footerLines.map((line) => (
          <p key={line} className="text-[11px] text-gray-800">
            {line}
          </p>
        ))}

        <p className="text-xs text-gray-700">
          Wind speeds shown in knots with mph derived (×1.15078). {def.org} · {def.kind} · Issued{' '}
          {formatEt(result.issuedAt)} ET ·{' '}
          <a href={result.sourceUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
            Source
          </a>
        </p>
      </div>
    </CollapsibleSection>
  );
}
