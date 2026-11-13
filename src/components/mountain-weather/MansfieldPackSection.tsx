import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import type { MansfieldPackData } from '@/lib/mountain-weather/read-mansfield-pack';
import { mansfieldPackSourceDefs } from '@/lib/mountain-weather/read-mansfield-pack';
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

function Footer({ def, issuedAt, sourceUrl }: { def: SourceDef; issuedAt: string | null; sourceUrl: string }) {
  return (
    <p className="text-xs text-gray-700">
      {def.org} · {def.kind} · Issued {formatEt(issuedAt)} ET ·{' '}
      <a href={sourceUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
        Source
      </a>
    </p>
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
  def,
  result,
  children,
}: {
  title: string;
  def: SourceDef;
  result: SourceResult<T>;
  children: React.ReactNode;
}) {
  const stale = result.status === 'stale' ? ' · stale' : '';
  const seasonal = result.status === 'seasonal-off';

  if (result.status === 'error' || !result.data) {
    return (
      <CollapsibleSection title={title} subtitle={`${def.org} (unavailable)${stale}`}>
        <p className="text-sm font-bold">{result.error ?? `${title} did not load.`}</p>
        <Footer def={def} issuedAt={result.issuedAt} sourceUrl={result.sourceUrl} />
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection
      title={title}
      subtitle={`${def.org} · ${def.kind}${seasonal ? ' · off season' : ''}${stale}`}
      defaultOpen={!seasonal}
    >
      <div className="space-y-2 text-sm">{children}</div>
      <Footer def={def} issuedAt={result.issuedAt} sourceUrl={result.sourceUrl} />
    </CollapsibleSection>
  );
}

export function MansfieldPackSection({ pack }: { pack: MansfieldPackData | null }) {
  if (!pack) return null;

  const defs = Object.fromEntries(mansfieldPackSourceDefs().map((s) => [s.key, s.def])) as Record<
    keyof MansfieldPackData,
    SourceDef
  >;

  return (
    <>
      <PackBlock title="Summit station (MMNV1)" def={defs.station} result={pack.station}>
        {pack.station.data ? (
          <>
            <p className="text-xs font-bold uppercase text-gray-800">{pack.station.data.stationName ?? 'MMNV1'}</p>
            {pack.station.data.fields.length === 0 ? (
              <p className="text-xs text-gray-700">No scalar fields in the latest observation (check RR2 SHEF below).</p>
            ) : (
              <ul className="grid gap-1 sm:grid-cols-2">
                {pack.station.data.fields.map((f) => (
                  <li key={f.key}>
                    <span className="font-bold">{f.label}:</span>{' '}
                    {f.value === null ? '—' : `${f.value}${f.unit ? ` ${f.unit}` : ''}`}
                    {f.qualityControl ? <span className="text-gray-600"> ({f.qualityControl})</span> : null}
                  </li>
                ))}
              </ul>
            )}
            {pack.station.data.timestamp ? (
              <p className="text-xs text-gray-700">Observation {formatEt(pack.station.data.timestamp)} ET</p>
            ) : null}
          </>
        ) : null}
      </PackBlock>

      <PackBlock title="RR2 summit temperature (SHEF)" def={defs.rr2Summit} result={pack.rr2Summit}>
        {pack.rr2Summit.data ? (
          <>
            <p>
              <span className="font-bold">TAIRGZZ:</span>{' '}
              {pack.rr2Summit.data.summitTempF === null ? '—' : `${pack.rr2Summit.data.summitTempF} °F`}
            </p>
            <p className="font-mono text-xs text-gray-800">{pack.rr2Summit.data.rawLine}</p>
          </>
        ) : null}
      </PackBlock>

      <PackBlock title="Elevation profile" def={defs.profile} result={pack.profile}>
        {pack.profile.data ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-[#5c3a1e]/30 text-xs">
                <thead className="bg-white/70">
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
                    <tr key={row.id} className="border-t border-[#5c3a1e]/15">
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

      <PackBlock title="Mansfield snow stake (HYD)" def={defs.hyd} result={pack.hyd}>
        {pack.hyd.status === 'seasonal-off' ? (
          <p className="border border-[#5c3a1e]/30 bg-white/60 p-2 text-xs font-bold">
            {defaultResumeHint('stake')}
            {pack.hyd.issuedAt ? ` Last update ${formatEt(pack.hyd.issuedAt)} ET.` : ''}
            {pack.hyd.data?.seasonalMessage ? ` ${pack.hyd.data.seasonalMessage}` : null}
          </p>
        ) : null}
        {pack.hyd.data && pack.hyd.status !== 'seasonal-off' ? (
          <>
            {pack.hyd.data.headerLines.map((line) => (
              <p key={line} className="text-xs text-gray-800">
                {line}
              </p>
            ))}
            <div className="overflow-x-auto">
              <table className="min-w-full border border-[#5c3a1e]/30 text-xs">
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
                    <tr key={label} className="border-t border-[#5c3a1e]/15">
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

      <PackBlock title="Snow depth climatology (in)" def={defs.climatology} result={pack.climatology}>
        {pack.climatology.data ? (
          <div className="max-h-96 overflow-auto">
            <table className="min-w-full border border-[#5c3a1e]/30 text-[11px]">
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
                  <tr key={`${row.monthIndex}-${row.day}`} className="border-t border-[#5c3a1e]/10">
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
    </>
  );
}
