import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import type { PlaceSnowData } from '@/lib/mountain-weather/snow-types';
import { NOHRSC_NE_INDEX_DEF } from '@/lib/mountain-weather/readers/nohrsc-northeast-images';
import { NOHRSC_STATION_SNOWDEPTH_DEF } from '@/lib/mountain-weather/readers/nohrsc-station-snowdepth';
import { NERFC_SNOW_OPS_DEF } from '@/lib/mountain-weather/readers/nerfc-snow-ops';
import { WPC_PWPF_SNOW_DEF, WPC_SNOW_PAGE_URL } from '@/lib/mountain-weather/readers/wpc-pwpf-snow';
import { nwsPnsSourceDef } from '@/lib/mountain-weather/readers/nws-pns-latest';
import { iemLsrSnowSourceDef } from '@/lib/mountain-weather/readers/iem-lsr-snow';
import { NWS_BTV_MANSFIELD_HYD_DEF } from '@/lib/mountain-weather/registry';
import { LOCAL_SNOW_RADIUS_MI } from '@/lib/mountain-weather/local-snow-reports';
import { formatEt } from '@/lib/mountain-weather/format-display';
import { SnowRemoteImage } from '@/components/mountain-weather/SnowRemoteImage';
import { ImageCaption, SourceReceipt } from '@/components/mountain-weather/kit';

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
            <SnowRemoteImage key={img.url} src={img.url} alt={img.label} sourceUrl={sourceUrl} />
            <ImageCaption label={img.validTimeLabel} href={img.url} prefix="Model run" />
          </figure>
        ))}
      </div>
      <SourceReceipt org={org} product={title} href={sourceUrl} linkLabel="Source page" />
    </CollapsibleSection>
  );
}

function MeasuredBlock({ data }: { data: PlaceSnowData }) {
  if (!data.measured.length) {
    return null;
  }
  // Only stations that actually reported; four "No report" rows told nobody anything.
  const reported = data.measured.filter((row) => row.value !== null);
  const silent = data.measured.length - reported.length;
  return (
    <CollapsibleSection title="Nearest measured snow" subtitle="NOHRSC / CoCoRaHS station table" defaultOpen>
      {reported.length === 0 ? (
        <p className="text-sm">
          {data.measured.length === 1
            ? 'The nearest snow station has not reported a depth today.'
            : `None of the ${data.measured.length} nearest snow stations has reported a depth today.`}{' '}
          <a href={NOHRSC_STATION_SNOWDEPTH_DEF.url} className="font-bold underline" target="_blank" rel="noopener noreferrer">
            NOHRSC station table ›
          </a>
        </p>
      ) : (
        <p className="text-xs text-ink-2">These are station snow depths, not summit conditions unless marked Summit. Check the station elevation, distance, and report time.</p>
      )}
      <ul className="space-y-3">
        {reported.map((row) => {
          const b = row.binding;
          const distant = b.distanceMi > 25;
          return (
            <li key={row.dedupeKey} className="border border-hairline bg-white/50 p-2 text-sm">
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
              <p className="text-xs text-ink">
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
              <p className="mt-1 text-base font-bold">
                {row.value === null ? (
                  <span className="text-ink">No report / missing</span>
                ) : row.value === 0 ? (
                  <span>0 in depth reported (not the same as “no snow season”)</span>
                ) : (
                  <span>
                    {row.valueDisplay} in ({row.element})
                  </span>
                )}
              </p>
              <p className="text-xs text-ink-2">Reported {row.reportTimeEt ?? row.reportTimeUtc ?? '—'}</p>
            </li>
          );
        })}
      </ul>
      {reported.length > 0 && silent > 0 ? (
        <p className="text-xs text-ink-2">{silent} other nearby station{silent === 1 ? '' : 's'} sent no report.</p>
      ) : null}
      <SourceReceipt
        org={NOHRSC_STATION_SNOWDEPTH_DEF.org}
        product="Station snow depth table (NOHRSC, CoCoRaHS)"
        href={NOHRSC_STATION_SNOWDEPTH_DEF.url}
      />
    </CollapsibleSection>
  );
}

export function SnowSection({ data, placeName, isHub = false }: { data: PlaceSnowData; placeName?: string; isHub?: boolean }) {
  const pnsDef = nwsPnsSourceDef(data.office);
  const lsrDef = iemLsrSnowSourceDef(data.office);

  return (
    <>
      <h2 className="text-lg font-bold uppercase tracking-wide text-ink">Snow</h2>
      <p className="text-sm text-ink-2">
        {isHub ? 'Regional WPC probabilities and modeled snow. ' : 'WPC probabilities, winter severity, modeled snow, storm reports, and nearest station depth. '}
        <a href={WPC_SNOW_PAGE_URL} className="font-bold underline" target="_blank" rel="noopener noreferrer">WPC snow forecast</a>
        {!isHub ? <>
        {' · '}
        <a href={data.winterPageUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
          NWS winter page ({data.office})
        </a>
        {' · '}
        <a href={data.wssiUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
          WSSI ({data.office})
        </a>
        </> : null}
      </p>
      <SnowImageGrid title="WPC probabilistic snowfall" org={WPC_PWPF_SNOW_DEF.org} sourceUrl={WPC_SNOW_PAGE_URL} images={data.wpcImages} />
      {!data.wpcImages.length ? <p className="text-sm text-ink-2">Current WPC graphics are unavailable here. Use the official WPC snow forecast linked above.</p> : null}
      <SnowImageGrid title="NOHRSC modeled layers" org={NOHRSC_NE_INDEX_DEF.org} sourceUrl={NOHRSC_NE_INDEX_DEF.url} images={data.nohrscImages} />
      <SnowImageGrid title="NERFC / NOHRSC composites" org={NERFC_SNOW_OPS_DEF.org} sourceUrl={NERFC_SNOW_OPS_DEF.url} images={data.nerfcImages} />
      {data.mansfieldStake ? (
        <CollapsibleSection title="Mount Mansfield snow stake" subtitle={`${NWS_BTV_MANSFIELD_HYD_DEF.org} · BTV HYD`} defaultOpen>
          <p className="text-sm">
            New snow: {data.mansfieldStake.snowNew ?? '—'} · Total on stake: {data.mansfieldStake.snowTotal ?? '—'}
          </p>
          <SourceReceipt
            org={NWS_BTV_MANSFIELD_HYD_DEF.org}
            product="Hydrologic Summary (HYD)"
            at={data.mansfieldStake.asOf}
            expectedEveryHours={NWS_BTV_MANSFIELD_HYD_DEF.expectedEveryHours}
            href={NWS_BTV_MANSFIELD_HYD_DEF.url}
          />
        </CollapsibleSection>
      ) : null}
      <MeasuredBlock data={data} />
      {data.pns ? (
      <CollapsibleSection title={`Office-wide storm bulletin · PNS (${data.office})`} subtitle={`${pnsDef.org} · may include distant locations`}>
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
              <p className="text-sm">The latest bulletin from this office has no snow reports in it.</p>
            )}
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-bold">Original bulletin text</summary>
              <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap border border-hairline bg-surface p-2 text-[10px]">
                {data.pns.fullText.trim()}
              </pre>
            </details>
            <SourceReceipt
              org={pnsDef.org}
              product="Public Information Statement (PNS)"
              at={data.pns.issuanceTime}
              href={pnsDef.url}
            />
          </>
      </CollapsibleSection>
      ) : null}
      {placeName ? (
      <CollapsibleSection title={`Snowfall reports near ${placeName} (within ${LOCAL_SNOW_RADIUS_MI} mi, past 14 days)`} subtitle={`${lsrDef.org} · ${data.office} feed`}>
          {data.lsrSnow.length ? (
          <ul className="space-y-1 text-xs">
            {data.lsrSnow.slice(0, 25).map((e) => (
              <li key={e.id}>
                {e.distanceMi?.toFixed(1) ?? '—'} mi away · {formatEt(e.valid)} · {e.city ?? '—'}, {e.county ?? ''} {e.state ?? ''} · {e.magnitude ?? '—'} {e.unit ?? ''}{' '}
                {e.remark && !/^[\s&$]*$/.test(e.remark) ? `· ${e.remark}` : ''}
              </li>
            ))}
          </ul>
          ) : <p className="text-sm">No nearby snowfall reports in the past 14 days. This does not mean there is no snow.</p>}
        <SourceReceipt org={lsrDef.org} product="Local Storm Reports (LSR)" href={lsrDef.url} />
      </CollapsibleSection>
      ) : null}
    </>
  );
}
