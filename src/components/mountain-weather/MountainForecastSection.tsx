import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import type { MtnNarrativePeriod, MtnPointBundle } from '@/lib/mountain-weather/mtn-point-types';
import { windDirFromDegrees } from '@/lib/mountain-weather/parse/mtn-sky';
import type { SourceResult } from '@/lib/mountain-weather/source-types';
import {
  NWS_MTN_ALY_ENHANCED_DEF,
  NWS_MTN_ALY_STANDARD_DEF,
  NWS_MTN_BTV_ENHANCED_DEF,
  NWS_MTN_BTV_STANDARD_DEF,
} from '@/lib/mountain-weather/registry';

function sourceLabel(office: 'BTV' | 'ALY'): { org: string } {
  if (office === 'BTV') {
    return { org: `${NWS_MTN_BTV_ENHANCED_DEF.org} mountain point` };
  }
  return { org: `${NWS_MTN_ALY_ENHANCED_DEF.org} mountain point` };
}

function fmtNum(value: number | null | undefined, suffix = ''): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${value}${suffix}`;
}

export function MountainForecastSection({
  result,
  placeName,
}: {
  result: SourceResult<MtnPointBundle> | null;
  placeName: string;
}) {
  if (!result) return null;

  const source = result.data ? sourceLabel(result.data.office) : null;
  const stale = result.status === 'stale' ? ' · stale' : '';

  if (result.status === 'error' || !result.data) {
    return (
      <CollapsibleSection
        title="Mountain forecast"
        subtitle={source ? `${source.org} (unavailable)${stale}` : 'Mountain point forecast unavailable'}
      >
        <p className="text-sm font-bold">{result.error ?? 'Mountain point forecast did not load.'}</p>
      </CollapsibleSection>
    );
  }

  const data = result.data;
  const enhanced = data.enhanced;
  const standard = data.standard;

  return (
    <CollapsibleSection
      title="Mountain forecast"
      subtitle={`${source?.org} · ${data.loc}${enhanced ? ' · enhanced hourly table' : ' · standard table'}${stale}`}
      defaultOpen
    >
      <div className="space-y-4 text-sm">
        {standard?.issuedLine ? <p className="text-xs text-gray-700">{standard.issuedLine}</p> : null}
        {standard?.narratives?.length ? (
          <NarrativeList narratives={standard.narratives} placeName={placeName} />
        ) : null}
        <div className="overflow-x-auto">
            <table className="min-w-full border border-[#5c3a1e]/30 text-xs">
              <thead className="bg-white/70">
                <tr className="text-left uppercase tracking-wide">
                  <th className="px-2 py-1">Period</th>
                  <th className="px-2 py-1">Temp</th>
                  <th className="px-2 py-1">Wind</th>
                  {data.hasGust ? <th className="px-2 py-1">Gust</th> : null}
                  <th className="px-2 py-1">Chill</th>
                  <th className="px-2 py-1">PoP</th>
                  <th className="px-2 py-1">Sky</th>
                  <th className="px-2 py-1">Snow</th>
                  {data.hasIce ? <th className="px-2 py-1">Ice</th> : null}
                </tr>
              </thead>
              <tbody>
                {enhanced?.hourly?.length
                  ? enhanced.hourly.map((row) => (
                    <tr key={`${row.label}-${row.tempF}-${row.windMph}`} className="border-t border-[#5c3a1e]/15">
                      <td className="whitespace-nowrap px-2 py-1 font-bold">{row.label}</td>
                      <td className="px-2 py-1 tabular-nums">{fmtNum(row.tempF, '°')}</td>
                      <td className="px-2 py-1">
                        {row.windDir ?? windDirFromDegrees(row.windDirDeg)} {fmtNum(row.windMph, ' mph')}
                      </td>
                      {data.hasGust ? <td className="px-2 py-1 tabular-nums">{fmtNum(row.gustMph, ' mph')}</td> : null}
                      <td className="px-2 py-1 tabular-nums">{fmtNum(row.windChillF, '°')}</td>
                      <td className="px-2 py-1 tabular-nums">{fmtNum(row.precipPct, '%')}</td>
                      <td className="px-2 py-1">{row.sky ?? '—'}</td>
                      <td className="px-2 py-1 tabular-nums">{fmtNum(row.snowIn, '"')}</td>
                      {data.hasIce ? <td className="px-2 py-1 tabular-nums">{fmtNum(row.iceIn, '"')}</td> : null}
                    </tr>
                  ))
                  : standard?.tabular.map((row) => (
                    <tr key={row.label} className="border-t border-[#5c3a1e]/15">
                      <td className="whitespace-nowrap px-2 py-1 font-bold">{row.label}</td>
                      <td className="px-2 py-1 tabular-nums">{fmtNum(row.tempF, '°')}</td>
                      <td className="px-2 py-1">{row.windDir ?? '—'} {fmtNum(row.windMph, ' mph')}</td>
                      {data.hasGust ? <td className="px-2 py-1 tabular-nums">{fmtNum(row.gustMph, ' mph')}</td> : null}
                      <td className="px-2 py-1 tabular-nums">{fmtNum(row.windChillF, '°')}</td>
                      <td className="px-2 py-1 tabular-nums">{fmtNum(row.precipPct, '%')}</td>
                      <td className="px-2 py-1">{row.sky ?? '—'}</td>
                      <td className="px-2 py-1 tabular-nums">{fmtNum(row.snowIn, '"')}</td>
                      {data.hasIce ? <td className="px-2 py-1 tabular-nums">{fmtNum(row.iceIn, '"')}</td> : null}
                    </tr>
                  ))}
              </tbody>
            </table>
        </div>
        <p className="text-xs text-gray-700">
          Source: {source?.org} ·{' '}
          <a href={result.sourceUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
            NWS mountain XML ({data.office === 'BTV' ? NWS_MTN_BTV_STANDARD_DEF.url : NWS_MTN_ALY_STANDARD_DEF.url})
          </a>
          {result.issuedAt
            ? ` · Last-Modified ${new Date(result.issuedAt).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`
            : null}
        </p>
      </div>
    </CollapsibleSection>
  );
}

function NarrativeList({ narratives, placeName }: { narratives: MtnNarrativePeriod[]; placeName: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-gray-700">Narrative · {placeName}</p>
      <ul className="mt-1 space-y-2">
        {narratives.map((block) => (
          <li key={block.name}>
            <p className="font-bold">{block.name}</p>
            <p className="text-gray-800">{block.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
