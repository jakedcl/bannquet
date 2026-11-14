import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import type { PlaceSnowData } from '@/lib/mountain-weather/snow-types';
import { NOHRSC_NE_INDEX_DEF } from '@/lib/mountain-weather/readers/nohrsc-northeast-images';
import { NOHRSC_STATION_SNOWDEPTH_DEF } from '@/lib/mountain-weather/readers/nohrsc-station-snowdepth';
import { NERFC_SNOW_OPS_DEF } from '@/lib/mountain-weather/readers/nerfc-snow-ops';
import { WPC_PWPF_SNOW_DEF } from '@/lib/mountain-weather/readers/wpc-pwpf-snow';
import { nwsPnsSourceDef } from '@/lib/mountain-weather/readers/nws-pns-latest';
import { iemLsrSnowSourceDef } from '@/lib/mountain-weather/readers/iem-lsr-snow';
import { NWS_BTV_MANSFIELD_HYD_DEF } from '@/lib/mountain-weather/registry';
import { snowMeasuredRuleSummary } from '@/lib/mountain-weather/snow-measured-bindings';

function SnowImageGrid({
  title,
  org,
  sourceUrl,
  images,
}: {
  title: string;
  org: string;
  sourceUrl: string;
  images: PlaceSnowData['wpcImages'];
}) {
  if (!images.length) return null;
  return (
    <CollapsibleSection title={title} subtitle={`${org} · images`}>
      <div className="grid gap-3 sm:grid-cols-2">
        {images.map((img) => (
          <figure key={img.id} className="space-y-1">
            <figcaption className="text-xs font-bold">{img.label}</figcaption>
            {img.validTimeLabel ? <p className="text-[10px] text-gray-700">Valid/cycle: {img.validTimeLabel}</p> : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.label} className="max-w-full border border-[#5c3a1e]/30 bg-white" />
            <p className="text-[10px] text-gray-700">
              {img.org} ·{' '}
              <a href={img.url} className="font-bold underline" target="_blank" rel="noopener noreferrer">
                Image URL
              </a>
            </p>
          </figure>
        ))}
      </div>
      <p className="text-xs text-gray-700">
        {org} ·{' '}
        <a href={sourceUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
          Source page
        </a>
      </p>
    </CollapsibleSection>
  );
}

function MeasuredBlock({ data }: { data: PlaceSnowData }) {
  if (!data.measured.length) {
    return null;
  }
  return (
    <CollapsibleSection title="Nearest measured snow" subtitle="NOHRSC / CoCoRaHS station table" defaultOpen>
      <p className="text-xs text-gray-700">{snowMeasuredRuleSummary()}</p>
      <ul className="space-y-3">
        {data.measured.map((row) => {
          const b = row.binding;
          const distant = b.distanceMi > 25;
          return (
            <li key={row.dedupeKey} className="border border-[#5c3a1e]/20 bg-white/50 p-2 text-sm">
              <p className="font-bold">
                {b.kind === 'summit'
                  ? 'Summit'
                  : b.kind === 'nearby-higher'
                    ? 'Nearby higher'
                    : b.kind === 'valley'
                      ? 'Valley / lower'
                      : 'Base'}{' '}
                · {b.stationName} ({b.stationId})
              </p>
              <p className="text-xs text-gray-800">
                {b.network} · {b.distanceMi} mi · {b.stationElevationFt?.toLocaleString('en-US') ?? '—'} ft station elev
                {b.elevationSource ? ` (${b.elevationSource})` : ''}
                {b.elevationDiffFt !== null
                  ? ` · ${b.elevationDiffFt >= 0 ? '+' : ''}${b.elevationDiffFt.toLocaleString('en-US')} ft vs catalog`
                  : ''}{' '}
                · {b.source} · {row.windowLabel}
              </p>
              {distant ? (
                <p className="text-xs font-bold text-amber-950">
                  Distant station: {b.distanceMi} mi away, may not reflect conditions here.
                </p>
              ) : null}
              <p className="text-xs text-gray-600">{b.bindReason}</p>
              <p className="mt-1 text-base font-bold">
                {row.value === null ? (
                  <span className="text-gray-800">No report / missing</span>
                ) : row.value === 0 ? (
                  <span>0 in depth reported (not the same as “no snow season”)</span>
                ) : (
                  <span>
                    {row.valueDisplay} in ({row.element})
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-700">
                Report time: {row.reportTimeEt ?? row.reportTimeUtc ?? '—'} · {NOHRSC_STATION_SNOWDEPTH_DEF.org} ·{' '}
                <a href={NOHRSC_STATION_SNOWDEPTH_DEF.url} className="font-bold underline" target="_blank" rel="noopener noreferrer">
                  Source
                </a>
              </p>
            </li>
          );
        })}
      </ul>
    </CollapsibleSection>
  );
}

export function SnowSection({ data }: { data: PlaceSnowData }) {
  const pnsDef = nwsPnsSourceDef(data.office);
  const lsrDef = iemLsrSnowSourceDef(data.office);

  return (
    <>
      <h2 className="text-lg font-bold uppercase tracking-wide text-gray-900">Snow</h2>
      <p className="text-sm text-gray-700">
        WPC probabilities, winter severity, modeled snow, storm reports, and nearest station depth.{' '}
        <a href={data.winterPageUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
          NWS winter page ({data.office})
        </a>
        {' · '}
        <a href={data.wssiUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
          WSSI ({data.office})
        </a>
      </p>
      <SnowImageGrid title="WPC probabilistic snowfall" org={WPC_PWPF_SNOW_DEF.org} sourceUrl={WPC_PWPF_SNOW_DEF.url} images={data.wpcImages} />
      <SnowImageGrid title="NOHRSC modeled layers" org={NOHRSC_NE_INDEX_DEF.org} sourceUrl={NOHRSC_NE_INDEX_DEF.url} images={data.nohrscImages} />
      <SnowImageGrid title="NERFC / NOHRSC composites" org={NERFC_SNOW_OPS_DEF.org} sourceUrl={NERFC_SNOW_OPS_DEF.url} images={data.nerfcImages} />
      {data.mansfieldStake ? (
        <CollapsibleSection title="Mount Mansfield snow stake" subtitle={`${NWS_BTV_MANSFIELD_HYD_DEF.org} · BTV HYD`} defaultOpen>
          <p className="text-sm">
            New snow: {data.mansfieldStake.snowNew ?? '—'} · Total on stake: {data.mansfieldStake.snowTotal ?? '—'}
          </p>
          <p className="text-xs text-gray-700">
            {NWS_BTV_MANSFIELD_HYD_DEF.org} · Issued {data.mansfieldStake.asOf ?? '—'} ·{' '}
            <a href={NWS_BTV_MANSFIELD_HYD_DEF.url} className="font-bold underline" target="_blank" rel="noopener noreferrer">
              Source
            </a>
          </p>
        </CollapsibleSection>
      ) : null}
      <MeasuredBlock data={data} />
      {data.pns ? (
      <CollapsibleSection title={`Storm reports · PNS (${data.office})`} subtitle={pnsDef.org}>
          <>
            {data.pns.parseReliable ? (
              <ul className="space-y-1 text-xs">
                {data.pns.parsedLines.slice(0, 30).map((line, i) => (
                  <li key={i}>
                    <span className="font-bold">{line.location}</span> · {line.amount} · {line.timeLabel}
                    {line.provider ? ` · ${line.provider}` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-700">Structured snow lines not reliable; full bulletin below.</p>
            )}
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap border border-[#5c3a1e]/20 bg-white/60 p-2 text-[10px]">
              {data.pns.fullText.trim()}
            </pre>
            <p className="text-xs text-gray-700">
              Issued {data.pns.issuanceTime ?? '—'} ·{' '}
              <a href={pnsDef.url} className="font-bold underline" target="_blank" rel="noopener noreferrer">
                Latest PNS
              </a>
            </p>
          </>
      </CollapsibleSection>
      ) : null}
      {data.lsrSnow.length ? (
      <CollapsibleSection title={`LSR snowfall (14d, ${data.office})`} subtitle={lsrDef.org}>
          <ul className="space-y-1 text-xs">
            {data.lsrSnow.slice(0, 25).map((e) => (
              <li key={e.id}>
                {e.valid} · {e.city ?? '—'}, {e.county ?? ''} {e.state ?? ''} · {e.magnitude ?? '—'} {e.unit ?? ''}{' '}
                {e.remark ? `· ${e.remark}` : ''}
              </li>
            ))}
          </ul>
        <p className="text-xs text-gray-700">
          <a href={lsrDef.url} className="font-bold underline" target="_blank" rel="noopener noreferrer">
            IEM LSR GeoJSON source
          </a>
        </p>
      </CollapsibleSection>
      ) : null}
    </>
  );
}