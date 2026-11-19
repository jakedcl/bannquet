import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import { SourceErrorNote } from '@/components/mountain-weather/SourceErrorNote';
import { AvgForecastSection } from '@/components/mountain-weather/AvgForecastSection';
import type { AvalancheDangerBand, AvalancheProblem, AvalancheProductBundle } from '@/lib/mountain-weather/avalanche-types';
import type { PlaceAvalancheData } from '@/lib/mountain-weather/read-place-avalanche';
import { AVALANCHE_MAP_LAYER_MWAC_DEF } from '@/lib/mountain-weather/readers/avalanche-map-layer-mwac';
import { AVALANCHE_MAP_LAYER_NYSAC_DEF } from '@/lib/mountain-weather/readers/avalanche-map-layer-nysac';
import { avalancheProductSourceDef } from '@/lib/mountain-weather/readers/avalanche-product';
import type { SourceDef, SourceResult } from '@/lib/mountain-weather/source-types';

const CENTER_DEF: Record<string, SourceDef> = {
  MWAC: AVALANCHE_MAP_LAYER_MWAC_DEF,
  NYSAC: AVALANCHE_MAP_LAYER_NYSAC_DEF,
};

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

function showAvalancheBindNote(reason: string): boolean {
  if (!reason.trim()) return false;
  if (/point-in-polygon/i.test(reason)) return false;
  if (/geometry cached/i.test(reason)) return false;
  return true;
}

function statusHeadline(status: SourceResult<AvalancheProductBundle>['status'], data: AvalancheProductBundle | null): string {
  if (status === 'seasonal-off') return 'Not issued / off-season';
  if (status === 'error') return 'Unavailable';
  if (status === 'stale') return 'Expired forecast';
  if (!data) return 'No data';
  if (data.offSeason) return 'Not issued / off-season';
  return 'Active forecast';
}

function DangerBandTable({ bands }: { bands: AvalancheDangerBand[] }) {
  if (bands.length === 0) return <p className="text-xs text-ink-2">Danger by elevation band: none reported.</p>;
  return (
    <table className="w-full border border-hairline text-xs">
      <thead className="bg-surface">
        <tr>
          <th className="px-2 py-1 text-left">Band</th>
          <th className="px-2 py-1 text-left">Elevation (ft)</th>
          <th className="px-2 py-1 text-left">Danger</th>
          <th className="px-2 py-1 text-left">Level</th>
        </tr>
      </thead>
      <tbody>
        {bands.map((b, i) => (
          <tr key={i} className="border-t border-hairline">
            <td className="px-2 py-1">{b.name ?? '—'}</td>
            <td className="px-2 py-1">
              {b.lowerFt ?? '—'} – {b.upperFt ?? '—'}
            </td>
            <td className="px-2 py-1">{b.danger ?? '—'}</td>
            <td className="px-2 py-1">{b.dangerLevel ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProblemList({ problems }: { problems: AvalancheProblem[] }) {
  if (problems.length === 0) return <p className="text-xs text-ink-2">Avalanche problems: none reported.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {problems.map((p, i) => (
        <li key={i} className="border border-hairline bg-white/50 p-2">
          <p className="font-bold">{p.name ?? p.problemType ?? 'Problem'}</p>
          <p className="text-xs text-ink">
            Likelihood: {p.likelihood ?? '—'} · Size: {p.size ?? '—'}
          </p>
          <p className="text-xs text-ink">
            Aspects: {p.aspects.length ? p.aspects.join(', ') : '—'} · Elevations: {p.elevations.length ? p.elevations.join(', ') : '—'}
          </p>
          {p.roseData ? (
            <p className="font-mono text-[10px] text-ink-2">Rose data: {JSON.stringify(p.roseData)}</p>
          ) : null}
          {p.comment ? <p className="text-xs">{p.comment}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function RecordFields({ record, label }: { record: Record<string, unknown> | null; label: string }) {
  if (!record || Object.keys(record).length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-bold uppercase text-ink">{label}</p>
      <ul className="space-y-1 text-xs">
        {Object.entries(record).map(([k, v]) => (
          <li key={k}>
            <span className="font-bold">{k}:</span> {v === null || v === undefined ? 'null' : JSON.stringify(v)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CenterBlock({ result }: { result: SourceResult<AvalancheProductBundle> }) {
  const data = result.data;
  const centerId = data?.centerId ?? 'MWAC';
  const layerDef = CENTER_DEF[centerId] ?? CENTER_DEF.MWAC;
  const productDef = data ? avalancheProductSourceDef(data.mapLayer) : layerDef;
  const headline = statusHeadline(result.status, data);

  return (
    <CollapsibleSection
      title={`${centerId} · ${data?.zoneName ?? 'Avalanche forecast'}`}
      subtitle={`${productDef.org} · official · ${headline}`}
      defaultOpen={result.status === 'ok'}
    >
      {result.status === 'error' && !data ? (
        <SourceErrorNote label="Avalanche forecast" href={result.sourceUrl ?? 'https://www.avalanche.org/'} />
      ) : data ? (
        <div className="space-y-3 text-sm">
          {(result.status === 'seasonal-off' || data.offSeason) && (
            <p className="border border-hairline bg-surface p-2 text-xs font-bold">
              Not issued / off-season. This is not low danger.
              {data.mapLayer.startDate && data.mapLayer.endDate
                ? ` Issued ${formatEt(data.mapLayer.startDate)} ET, expires ${formatEt(data.mapLayer.endDate)} ET.`
                : data.lastKnownIssued
                  ? ` Last known issued ${formatEt(data.lastKnownIssued)} ET.`
                  : ''}
              {data.travelAdvice ? ` ${data.travelAdvice}` : ''}
            </p>
          )}
          {result.status === 'stale' ? (
            <p className="text-xs font-bold text-ink">Forecast expired — showing last issued product only.</p>
          ) : null}
          {data.bottomLine ? (
            <p>
              <span className="font-bold">Bottom line:</span> {data.bottomLine}
            </p>
          ) : null}
          {data.discussion ? (
            <p>
              <span className="font-bold">Discussion:</span> {data.discussion}
            </p>
          ) : null}
          {!data.offSeason && result.status === 'ok' ? (
            <>
              <DangerBandTable bands={data.dangerBands} />
              <ProblemList problems={data.problems} />
              <RecordFields record={data.weatherData} label="Weather (forecast product)" />
              <RecordFields record={data.observations} label="Observations (forecast product)" />
              {data.extraTopLevel.length > 0 ? (
                <ul className="space-y-1 text-xs">
                  {data.extraTopLevel.map((row) => (
                    <li key={row.key}>
                      <span className="font-bold">{row.key}:</span> {JSON.stringify(row.value)}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="text-xs text-ink-2">
                Issued {formatEt(data.publishedTime)} ET · Expires {formatEt(data.expiresTime)} ET
              </p>
            </>
          ) : null}
          {data.link ? (
            <p className="text-xs">
              <a href={data.link.trim()} className="font-bold underline" target="_blank" rel="noopener noreferrer">
                Center forecast page
              </a>
            </p>
          ) : null}
        </div>
      ) : null}
      <p className="text-xs text-ink-2">
        {layerDef.org} · map-layer + product ·{' '}
        <a href={result.sourceUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
          Source
        </a>
      </p>
    </CollapsibleSection>
  );
}

export function AvalancheSection({ data, showAvg = true }: { data: PlaceAvalancheData | null; showAvg?: boolean }) {
  if (!data) return null;

  return (
    <>
      <h2 className="text-lg font-bold uppercase tracking-wide text-ink">Avalanche</h2>
      {showAvalancheBindNote(data.binding.bindReason) ? (
        <p className="text-sm text-ink-2">{data.binding.bindReason}</p>
      ) : null}
      {data.centers.map((result, idx) => (
        <CenterBlock key={result.data?.centerId ?? idx} result={result} />
      ))}
      {showAvg && data.avg ? <AvgForecastSection results={data.avg} /> : null}
    </>
  );
}