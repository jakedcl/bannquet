import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import { SourceErrorNote } from '@/components/mountain-weather/SourceErrorNote';
import type { MansfieldPackData } from '@/lib/mountain-weather/read-mansfield-pack';
import { mansfieldPackSourceDefs } from '@/lib/mountain-weather/read-mansfield-pack';
import { Notice } from '@/components/hub/Notice';
import { SourceReceipt } from '@/components/mountain-weather/kit';
import { formatStationFieldDisplay, stationHasReadableMeasurements } from '@/lib/mountain-weather/parse/nws-station-units';
import { SHEF_CODE_LABELS } from '@/lib/mountain-weather/parse/rr2-mansfield';
import { defaultResumeHint } from '@/lib/mountain-weather/parse/seasonal-off';
import type { MmnDepthPoint } from '@/lib/mountain-weather/mansfield-types';
import type { SourceResult } from '@/lib/mountain-weather/source-types';
import type { SourceDef } from '@/lib/mountain-weather/source-types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

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

function Footer({
  def,
  product,
  issuedAt,
  status,
  sourceUrl,
}: {
  def: SourceDef;
  product?: string;
  issuedAt: string | null;
  status: string;
  sourceUrl: string;
}) {
  return (
    <SourceReceipt
      org={def.org}
      product={product}
      at={issuedAt}
      verb={def.kind === 'measured' ? 'observed' : 'issued'}
      status={status}
      expectedEveryHours={def.expectedEveryHours}
      href={sourceUrl}
    />
  );
}

function depthKey(p: MmnDepthPoint): string {
  return `${p.monthIndex}-${p.day}`;
}

function mergeClimatology(pack: MansfieldPackData['climatology']) {
  if (!pack.data) return [];
  const map = new Map<string, { monthIndex: number; day: number; avg: number | null; max: number | null; min: number | null }>();
  for (const row of pack.data.avg) {
    map.set(depthKey(row), { monthIndex: row.monthIndex, day: row.day, avg: row.depthIn, max: null, min: null });
  }
  for (const row of pack.data.max) {
    const e = map.get(depthKey(row)) ?? { monthIndex: row.monthIndex, day: row.day, avg: null, max: null, min: null };
    e.max = row.depthIn;
    map.set(depthKey(row), e);
  }
  for (const row of pack.data.min) {
    const e = map.get(depthKey(row)) ?? { monthIndex: row.monthIndex, day: row.day, avg: null, max: null, min: null };
    e.min = row.depthIn;
    map.set(depthKey(row), e);
  }
  return [...map.values()].sort((a, b) => a.monthIndex - b.monthIndex || a.day - b.day);
}

function PackBlock<T>({
  title,
  subtitleName,
  def,
  result,
  children,
}: {
  title: string;
  /** Official product name, shown under the plain title. */
  subtitleName?: string;
  def: SourceDef;
  result: SourceResult<T>;
  children: React.ReactNode;
}) {
  const stale = result.status === 'stale' ? ' · stale' : '';
  const seasonal = result.status === 'seasonal-off';

  if (result.status === 'error' || !result.data) {
    return (
      <CollapsibleSection title={title} subtitle={`${subtitleName ? `${subtitleName} · ` : ''}${def.org} (unavailable)${stale}`}>
        <SourceErrorNote label={title} href={result.sourceUrl ?? def.url} />
        <Footer def={def} product={subtitleName} issuedAt={result.issuedAt} status={result.status} sourceUrl={result.sourceUrl} />
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title={title}
      subtitle={`${subtitleName ? `${subtitleName} · ` : ''}${def.org}${seasonal ? ' · off season' : ''}${stale}`}
      defaultOpen={!seasonal}
    >
      <div className="space-y-2 text-sm">{children}</div>
      <Footer def={def} product={subtitleName} issuedAt={result.issuedAt} status={result.status} sourceUrl={result.sourceUrl} />
    </CollapsibleSection>
  );
}

/**
 * Mount Mansfield's own readers, split by place-page tab: `measured` (MMNV1
 * station, RR2 summit), `forecast` (elevation profile), `snow` (snow stake,
 * snow depth climatology). Without `part`, everything.
 */
export function MansfieldPackSection({ pack, part }: { pack: MansfieldPackData | null; part?: 'measured' | 'forecast' | 'snow' }) {
  if (!pack) return null;
  const show = {
    measured: !part || part === 'measured',
    forecast: !part || part === 'forecast',
    snow: !part || part === 'snow',
  };

  const defs = Object.fromEntries(mansfieldPackSourceDefs().map((s) => [s.key, s.def])) as Record<
    keyof MansfieldPackData,
    SourceDef
  >;

  return (
    <>
      {show.measured ? (
      <PackBlock title="Mansfield summit temperature" subtitleName="Summit report (RR2, SHEF) · MMNV1" def={defs.rr2Summit} result={pack.rr2Summit}>
        {pack.rr2Summit.data ? (
          <>
            {pack.rr2Summit.data.summitTempF !== null ? (
              <p>
                <span className="text-3xl font-bold text-ink">{pack.rr2Summit.data.summitTempF}°F</span>
                {pack.rr2Summit.data.observedAt ? (
                  <span className="ml-2 text-meta text-ink-2">at {formatEt(pack.rr2Summit.data.observedAt)} ET</span>
                ) : null}
              </p>
            ) : (
              <Notice>No summit temperature in the latest report.</Notice>
            )}
            <ul className="space-y-1 text-meta">
              {pack.rr2Summit.data.shefFields
                .filter((f) => !/^DH/i.test(f.code))
                .map((f) => (
                  <li key={f.code}>
                    {SHEF_CODE_LABELS[f.code] ? <span className="font-bold">{SHEF_CODE_LABELS[f.code]}</span> : null}{' '}
                    <span className="font-mono text-ink-2">{f.code}</span> {f.value ?? '—'}
                  </li>
                ))}
            </ul>
            <p className="font-mono text-xs text-ink-2 [overflow-wrap:anywhere]">{pack.rr2Summit.data.rawLine}</p>
          </>
        ) : null}
      </PackBlock>
      ) : null}

      {show.measured ? (
      <PackBlock title="Mansfield summit station" subtitleName="NWS observations · MMNV1" def={defs.station} result={pack.station}>
        {pack.station.data ? (
          <>
            <p className="text-xs font-bold uppercase text-ink">{pack.station.data.stationName ?? 'MMNV1'}</p>
            {!stationHasReadableMeasurements(pack.station.data.fields) ? (
              <Notice>No readings passed the NWS quality check in the last few reports. The summit temperature above comes from the separate RR2 report.</Notice>
            ) : null}
            <ul className="grid gap-1 sm:grid-cols-2 text-meta">
              {pack.station.data.fields.map((f) => (
                <li key={f.key}>
                  <span className="font-bold">{f.label}:</span>{' '}
                  {f.value === null || f.value === '' ? '—' : formatStationFieldDisplay(f)}
                  {f.qcFailed ? (
                    <span className="text-ink-2"> (failed NWS quality check)</span>
                  ) : f.qualityControl ? (
                    <span className="text-ink-2"> (QC {f.qualityControl})</span>
                  ) : null}
                  {f.observedAt ? <span className="text-ink-2"> · at {formatEt(f.observedAt)}</span> : null}
                </li>
              ))}
            </ul>
            {pack.station.data.timestamp ? (
              <p className="text-xs text-ink-2">Newest report {formatEt(pack.station.data.timestamp)} ET</p>
            ) : null}
          </>
        ) : null}
      </PackBlock>
      ) : null}

      {show.forecast ? (
      <PackBlock title="Elevation profile" subtitleName="Worked out from the Mountain Point Forecast" def={defs.profile} result={pack.profile}>
        {pack.profile.data ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-hairline text-xs">
                <thead className="bg-surface">
                  <tr className="text-left">
                    <th className="px-2 py-1">Site</th>
                    <th className="px-2 py-1">Elev (ft)</th>
                    <th className="px-2 py-1">Temp</th>
                    <th className="px-2 py-1">Wind dir</th>
                    <th className="px-2 py-1">Wind</th>
                    <th className="px-2 py-1">Gust</th>
                  </tr>
                </thead>
                <tbody>
                  {pack.profile.data.stations.map((row) => (
                    <tr key={row.id} className="border-t border-hairline">
                      <td className="px-2 py-1 font-bold">{row.id}</td>
                      <td className="px-2 py-1">{row.elevationFt ?? '—'}</td>
                      <td className="px-2 py-1">{row.temperature ?? '—'}</td>
                      <td className="px-2 py-1">{row.windDir ?? '—'}</td>
                      <td className="px-2 py-1">{row.wind ?? '—'}</td>
                      <td className="px-2 py-1">{row.gust ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="text-xs">
              <li>
                <span className="font-bold">Lapse:</span> {pack.profile.data.lapse ?? '—'}
              </li>
              <li>
                <span className="font-bold">Shear:</span> {pack.profile.data.shear ?? '—'}
              </li>
              <li>
                <span className="font-bold">Froude:</span> {pack.profile.data.froude ?? '—'}
              </li>
              <li>
                <span className="font-bold">LCL (ft):</span> {pack.profile.data.lclFt ?? '—'}
              </li>
            </ul>
          </>
        ) : null}
      </PackBlock>
      ) : null}

      {show.snow ? (
      <PackBlock title="Mansfield snow stake" subtitleName="Hydrologic Summary (HYD)" def={defs.hyd} result={pack.hyd}>
        {pack.hyd.status === 'seasonal-off' ? (
          <p className="border border-hairline bg-surface p-2 text-xs font-bold">
            {defaultResumeHint('stake')}
            {pack.hyd.issuedAt ? ` Last update ${formatEt(pack.hyd.issuedAt)} ET.` : ''}
            {pack.hyd.data?.seasonalMessage ? ` ${pack.hyd.data.seasonalMessage}` : null}
          </p>
        ) : null}
        {pack.hyd.data && pack.hyd.status !== 'seasonal-off' ? (
          <>
            {pack.hyd.data.headerLines.map((line) => (
              <p key={line} className="text-xs text-ink">
                {line}
              </p>
            ))}
            <div className="overflow-x-auto">
              <table className="min-w-full border border-hairline text-xs">
                <tbody>
                  {(
                    [
                      ['24 h precip', pack.hyd.data.row.precip24h],
                      ['Max temp', pack.hyd.data.row.tempMax],
                      ['Min temp', pack.hyd.data.row.tempMin],
                      ['Current temp', pack.hyd.data.row.tempCur],
                      ['Present weather', pack.hyd.data.row.presentWeather],
                      ['New snow', pack.hyd.data.row.snowNew],
                      ['Snow depth (total)', pack.hyd.data.row.snowTotal],
                      ['SWE', pack.hyd.data.row.swe],
                    ] as const
                  ).map(([label, value]) => (
                    <tr key={label} className="border-t border-hairline">
                      <td className="px-2 py-1 font-bold">{label}</td>
                      <td className="px-2 py-1">{value ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </PackBlock>
      ) : null}

      {show.snow ? (
      <PackBlock title="Snow depth climatology (in)" subtitleName="Mount Mansfield snow depth record" def={defs.climatology} result={pack.climatology}>
        {pack.climatology.data ? (
          <div className="max-h-96 overflow-auto">
            <table className="min-w-full border border-hairline text-[11px]">
              <thead className="sticky top-0 bg-white/90">
                <tr>
                  <th className="px-2 py-1 text-left">Date</th>
                  <th className="px-2 py-1 text-right">Avg</th>
                  <th className="px-2 py-1 text-right">Max</th>
                  <th className="px-2 py-1 text-right">Min</th>
                </tr>
              </thead>
              <tbody>
                {mergeClimatology(pack.climatology).map((row) => (
                  <tr key={`${row.monthIndex}-${row.day}`} className="border-t border-hairline">
                    <td className="px-2 py-0.5">
                      {MONTHS[row.monthIndex] ?? row.monthIndex} {row.day}
                    </td>
                    <td className="px-2 py-0.5 text-right">{row.avg ?? '—'}</td>
                    <td className="px-2 py-0.5 text-right">{row.max ?? '—'}</td>
                    <td className="px-2 py-0.5 text-right">{row.min ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </PackBlock>
      ) : null}
    </>
  );
}
