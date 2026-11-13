import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import { buildMtnDisplay, fmtMtnAmount, fmtMtnLightning } from '@/lib/mountain-weather/mtn-display';
import type { MtnPointBundle } from '@/lib/mountain-weather/mtn-point-types';
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

function fmtWind(row: {
  windDir?: string | null;
  windDirDeg?: number | null;
  windMph?: number | null;
}): string {
  const compass = row.windDir ?? windDirFromDegrees(row.windDirDeg ?? null);
  const mph = fmtNum(row.windMph ?? null, ' mph');
  if (!compass && mph === '—') return '—';
  if (row.windDirDeg !== null && row.windDirDeg !== undefined && Number.isFinite(row.windDirDeg)) {
    const deg = `${Math.round(row.windDirDeg)}°`;
    return [compass, deg, mph !== '—' ? mph : null].filter(Boolean).join(' ');
  }
  return [compass, mph !== '—' ? mph : null].filter(Boolean).join(' ');
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
  const display = buildMtnDisplay(data);
  const { meta, hourly, snowIce } = display;
  const elev =
    meta.nwsElevationFt !== null ? `${meta.nwsElevationFt.toLocaleString('en-US')} ft (NWS)` : null;

  return (
    <CollapsibleSection
      title="Mountain forecast"
      subtitle={`${source?.org} · ${data.loc}${data.enhanced ? ' · enhanced hourly table' : ' · standard table'}${elev ? ` · ${elev}` : ''}${stale}`}
      defaultOpen
    >
      <div className="space-y-4 text-sm">
        {meta.issuedLine ? <p className="text-xs font-bold text-gray-800">{meta.issuedLine}</p> : null}
        {data.standard?.narratives?.length ? (
          <NarrativeList narratives={data.standard.narratives} placeName={placeName} />
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-full border border-[#5c3a1e]/30 text-xs">
            <thead className="bg-white/70">
              <tr className="text-left uppercase tracking-wide">
                <th className="px-2 py-1">Period</th>
                <th className="px-2 py-1">Temp</th>
                <th className="px-2 py-1">Wind</th>
                {meta.showGust ? <th className="px-2 py-1">Gust</th> : null}
                <th className="px-2 py-1">Chill</th>
                <th className="px-2 py-1">PoP</th>
                <th className="px-2 py-1">Sky</th>
                {meta.showLightning ? <th className="px-2 py-1">Lightning</th> : null}
              </tr>
            </thead>
            <tbody>
              {hourly.map((row) => (
                <tr key={`${row.label}-${row.tempF}-${row.windMph}`} className="border-t border-[#5c3a1e]/15">
                  <td className="whitespace-nowrap px-2 py-1 font-bold">{row.label}</td>
                  <td className="px-2 py-1 tabular-nums">{fmtNum(row.tempF, '°')}</td>
                  <td className="px-2 py-1">{fmtWind(row)}</td>
                  {meta.showGust ? <td className="px-2 py-1 tabular-nums">{fmtNum(row.gustMph, ' mph')}</td> : null}
                  <td className="px-2 py-1 tabular-nums">{fmtNum(row.windChillF, '°')}</td>
                  <td className="px-2 py-1 tabular-nums">{fmtNum(row.precipPct, '%')}</td>
                  <td className="px-2 py-1">{row.sky ?? '—'}</td>
                  {meta.showLightning ? (
                    <td className="px-2 py-1">{fmtMtnLightning(row.lightning)}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta.showSnowBlocks && snowIce.length > 0 ? (
          <div className="overflow-x-auto">
            <p className="text-xs font-bold uppercase text-gray-700">6-hour snow and ice totals</p>
            <table className="mt-1 min-w-full border border-[#5c3a1e]/30 text-xs">
              <thead className="bg-white/70">
                <tr className="text-left uppercase tracking-wide">
                  <th className="px-2 py-1">Block start</th>
                  <th className="px-2 py-1">Snow</th>
                  {meta.showIce ? <th className="px-2 py-1">Ice</th> : null}
                </tr>
              </thead>
              <tbody>
                {snowIce.map((block) => (
                  <tr key={block.label} className="border-t border-[#5c3a1e]/15">
                    <td className="whitespace-nowrap px-2 py-1 font-bold">{block.label}</td>
                    <td className="px-2 py-1 tabular-nums">{fmtMtnAmount(block.snowIn)}</td>
                    {meta.showIce ? <td className="px-2 py-1 tabular-nums">{fmtMtnAmount(block.iceIn)}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <p className="text-xs text-gray-700">
          Source: {source?.org} ·{' '}
          <a href={result.sourceUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
            NWS mountain XML ({data.office === 'BTV' ? NWS_MTN_BTV_STANDARD_DEF.url : NWS_MTN_ALY_STANDARD_DEF.url})
          </a>
          {result.issuedAt
            ? ` · file Last-Modified ${new Date(result.issuedAt).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`
            : null}
        </p>
      </div>
    </CollapsibleSection>
  );
}

function NarrativeList({
  narratives,
  placeName,
}: {
  narratives: { name: string; text: string }[];
  placeName: string;
}) {
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
