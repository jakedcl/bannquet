import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import { SourceErrorNote } from '@/components/mountain-weather/SourceErrorNote';
import { ImageCaption, SourceReceipt } from '@/components/mountain-weather/kit';
import { MapImageGrid } from '@/components/mountain-weather/MapImageGrid';
import { MapRemoteImage } from '@/components/mountain-weather/MapRemoteImage';
import { MountainWeatherPlacesMap } from '@/components/mountain-weather/MountainWeatherPlacesMap';
import type { MapsSectionProps } from '@/lib/mountain-weather/map-types';
import { NWS_ALERTS_MAP_URL } from '@/lib/mountain-weather/read-place-maps';
import { NWS_RIDGE_NE_MOSAIC_DEF } from '@/lib/mountain-weather/readers/nws-ridge-radar';
import { GOES19_NE_GEOCOLOR_DEF, GOES19_NE_GLM_DEF } from '@/lib/mountain-weather/readers/goes-19-ne';
import { radarSiteLabel, nwsRidgeLoopUrl } from '@/lib/mountain-weather/radar-sites';
import { NWS_ALERTS_ACTIVE_NE_DEF as ALERTS_DEF } from '@/lib/mountain-weather/readers/nws-alerts-active-ne';
import { SPC_CONVECTIVE_OUTLOOK_DEF } from '@/lib/mountain-weather/readers/spc-convective-outlook';

function formatValid(summary: { effective: string | null; expires: string | null; onset: string | null; ends: string | null }) {
  const from = summary.effective ?? summary.onset;
  const to = summary.expires ?? summary.ends;
  if (from && to) return `${from} – ${to}`;
  if (from) return `from ${from}`;
  if (to) return `until ${to}`;
  return null;
}

export function MapsSection({ data, place }: MapsSectionProps) {
  const radarImages = [data.radarMosaic, data.radarSite].filter((img): img is NonNullable<typeof data.radarMosaic> => Boolean(img));

  const satelliteImages = [data.goesColor, data.goesGlm].filter(
    (img): img is NonNullable<typeof data.goesColor> => Boolean(img),
  );

  const alertBundle = data.alerts.status === 'ok' && data.alerts.data ? data.alerts.data : null;

  return (
    <CollapsibleSection title="Maps" subtitle="Radar, satellite, lightning, alerts and outlooks, from government sources">
      {place && data.radarSiteId ? (
        <p className="text-sm text-ink-2">
          Nearest radar: {radarSiteLabel(data.radarSiteId)} (WSR-88D) ·{' '}
          <a href={nwsRidgeLoopUrl(data.radarSiteId)} className="font-bold underline" target="_blank" rel="noopener noreferrer">
            Full-size loop ›
          </a>
        </p>
      ) : null}

      <MapImageGrid
        title="Radar"
        sourceUrl={NWS_RIDGE_NE_MOSAIC_DEF.url}
        images={radarImages}
        refreshNote="Radar loops (RIDGE), refreshed about every 5 minutes"
      />

      <MapImageGrid
        title="Satellite"
        sourceUrl={GOES19_NE_GEOCOLOR_DEF.url}
        images={satelliteImages}
        refreshNote="GOES-19 Northeast sector, refreshed about every 5 minutes"
      />

      <section className="panel panel-cream p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide">Weather alerts</h3>
        <p className="text-xs text-ink-2">
          Active alerts (NWS) · {alertBundle?.alerts.length ?? 0} in NY, VT, NH and ME · {alertBundle?.mapGeoJson.features.length ?? 0} shaded on the map below
        </p>
        {data.alerts.status === 'error' ? (
          <SourceErrorNote label="NWS active alerts" href={data.alerts.sourceUrl ?? ALERTS_DEF.url} />
        ) : null}
        {alertBundle && alertBundle.alerts.length === 0 ? (
          <p className="text-sm">No active alerts in NY, VT, NH, or ME right now.</p>
        ) : null}
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {(alertBundle?.alerts ?? []).slice(0, place ? 6 : 20).map((row) => (
            <li key={row.id}>
              <span className="font-bold">{row.event}</span>
              {row.severity ? ` (${row.severity})` : ''}
              {row.headline ? ` — ${row.headline}` : ''}
              {formatValid(row) ? <span className="block text-xs text-ink-2">Valid {formatValid(row)}</span> : null}
            </li>
          ))}
        </ul>
        <SourceReceipt
          org={ALERTS_DEF.org}
          product="Active alerts"
          at={data.alerts.issuedAt}
          verb="checked"
          status={data.alerts.status}
          href={data.alerts.sourceUrl ?? ALERTS_DEF.url}
          extra={
            <a href={NWS_ALERTS_MAP_URL} className="font-bold underline" target="_blank" rel="noopener noreferrer">
              National warnings map ›
            </a>
          }
        />
      </section>

      <section className="panel panel-cream p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide">Thunderstorm and long-range outlooks</h3>
        <p className="text-xs text-ink-2">Official thunderstorm outlook maps and longer-range outlooks.</p>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          {data.outlooks.map((link) => (
            <li key={link.id}>
              <a href={link.href} className="font-bold underline" target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
              <span className="text-xs text-ink-2"> · {link.org}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {data.spcImages.map((img) => (
            <figure key={img.id} className="space-y-1">
              <figcaption className="text-xs font-bold">{img.label}</figcaption>
              <MapRemoteImage src={img.url} alt={img.label} expectedOk={img.httpOk} />
              <ImageCaption label={img.validTimeLabel} href={img.pageUrl} prefix="Issued" />
            </figure>
          ))}
        </div>
        <SourceReceipt org={SPC_CONVECTIVE_OUTLOOK_DEF.org} product="Convective outlooks" href={SPC_CONVECTIVE_OUTLOOK_DEF.url} linkLabel="Source page" />
        {data.spcImages.length === 0 ? (
          <p className="text-sm font-bold text-red-800">SPC outlook images could not be resolved (pages or PNG checks failed).</p>
        ) : null}
      </section>

      {data.pins?.length ? (
        <MountainWeatherPlacesMap
          pins={data.pins}
          alertMap={alertBundle}
          focus={place ? { lat: place.lat, lon: place.lon, zoom: 9 } : null}
        />
      ) : (
        <MountainWeatherPlacesMap
          pins={[]}
          alertMap={alertBundle}
          focus={place ? { lat: place.lat, lon: place.lon, zoom: 9 } : null}
        />
      )}
    </CollapsibleSection>
  );
}
