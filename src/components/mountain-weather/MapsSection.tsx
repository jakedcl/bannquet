import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import { MapImageGrid } from '@/components/mountain-weather/MapImageGrid';
import { MountainWeatherPlacesMap } from '@/components/mountain-weather/MountainWeatherPlacesMap';
import type { MapsSectionProps } from '@/lib/mountain-weather/map-types';
import { NWS_ALERTS_MAP_URL } from '@/lib/mountain-weather/read-place-maps';
import { NWS_RIDGE_NE_MOSAIC_DEF } from '@/lib/mountain-weather/readers/nws-ridge-radar';
import { GOES19_NE_GEOCOLOR_DEF, GOES19_NE_GLM_DEF } from '@/lib/mountain-weather/readers/goes-19-ne';
import { radarSiteLabel, nwsRidgeLoopUrl } from '@/lib/mountain-weather/radar-sites';
import { NWS_ALERTS_ACTIVE_NE_DEF as ALERTS_DEF } from '@/lib/mountain-weather/readers/nws-alerts-active-ne';

export function MapsSection({ data, place }: MapsSectionProps) {
  const radarImages = [
    data.radarMosaic,
    data.radarSite,
  ].filter((img): img is NonNullable<typeof data.radarMosaic> => Boolean(img));

  const satelliteImages = [data.goesColor, data.goesGlm].filter(
    (img): img is NonNullable<typeof data.goesColor> => Boolean(img),
  );

  const alertBundle = data.alerts.status === 'ok' && data.alerts.data ? data.alerts.data : null;
  const issued = data.alerts.issuedAt ? new Date(data.alerts.issuedAt).toLocaleString() : null;

  return (
    <CollapsibleSection title="Maps &amp; imagery" subtitle="Radar, satellite, lightning, alerts — government sources only">
      {place && data.radarSiteId ? (
        <p className="text-sm text-gray-700">
          Nearest WSR-88D loop for NWS {place.office}: {radarSiteLabel(data.radarSiteId)} ·{' '}
          <a href={nwsRidgeLoopUrl(data.radarSiteId)} className="font-bold underline" target="_blank" rel="noopener noreferrer">
            RIDGE loop
          </a>
        </p>
      ) : null}

      <MapImageGrid
        title="Radar"
        sourceUrl={NWS_RIDGE_NE_MOSAIC_DEF.url}
        images={radarImages}
        refreshNote="NWS RIDGE loops · refresh ~5 min"
      />

      <MapImageGrid
        title="Satellite"
        sourceUrl={GOES19_NE_GEOCOLOR_DEF.url}
        images={satelliteImages}
        refreshNote="NOAA STAR GOES-19 Northeast sector · refresh ~5 min"
      />

      <section className="retro-box border-[#5c3a1e] bg-beige/60 p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide">NWS active alerts</h3>
        <p className="text-xs text-gray-700">{ALERTS_DEF.org} · {alertBundle?.alerts.length ?? 0} for NY/VT/NH/ME</p>
        {data.alerts.status === 'error' ? (
          <p className="text-sm font-bold text-red-800">Alerts did not load: {data.alerts.error}</p>
        ) : null}
        {alertBundle && alertBundle.alerts.length === 0 ? (
          <p className="text-sm">No active alerts in NY, VT, NH, or ME right now.</p>
        ) : null}
        {issued ? <p className="text-xs text-gray-700">Feed fetched: {issued}</p> : null}
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {(alertBundle?.alerts ?? []).slice(0, place ? 6 : 20).map((row) => (
            <li key={row.id}>
              <span className="font-bold">{row.event}</span>
              {row.severity ? ` (${row.severity})` : ''}
              {row.headline ? ` — ${row.headline}` : ''}
              {row.ends ? <span className="block text-xs text-gray-700">Ends {row.ends}</span> : null}
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-700">
          <a href={NWS_ALERTS_MAP_URL} className="font-bold underline" target="_blank" rel="noopener noreferrer">
            NWS national warnings map
          </a>
          {' · '}
          <a href={ALERTS_DEF.url} className="font-bold underline" target="_blank" rel="noopener noreferrer">
            Alerts API
          </a>
        </p>
      </section>

      <section className="retro-box border-[#5c3a1e] bg-beige/60 p-4">
        <h3 className="text-sm font-bold uppercase tracking-wide">SPC &amp; CPC outlooks</h3>
        <p className="text-xs text-gray-700">Links and static images</p>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          {data.outlooks.map((link) => (
            <li key={link.id}>
              <a href={link.href} className="font-bold underline" target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
              <span className="text-xs text-gray-700"> · {link.org}</span>
              {link.id === 'spc-day1' ? (
                <figure className="mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={link.href} alt="SPC Day 1 outlook" className="max-w-full border border-[#5c3a1e]/30 bg-white" />
                  <figcaption className="text-[10px] text-gray-700">Updates when SPC publishes a new outlook</figcaption>
                </figure>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {data.pins?.length ? (
        <MountainWeatherPlacesMap
          pins={data.pins}
          alertPins={alertBundle?.mapPins}
          focus={place ? { lat: place.lat, lon: place.lon, zoom: 9 } : null}
        />
      ) : place ? (
        <MountainWeatherPlacesMap
          pins={[]}
          alertPins={alertBundle?.mapPins}
          focus={{ lat: place.lat, lon: place.lon, zoom: 9 }}
        />
      ) : null}
    </CollapsibleSection>
  );
}