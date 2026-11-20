import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import { SourceErrorNote } from '@/components/mountain-weather/SourceErrorNote';
import { SourceReceipt } from '@/components/mountain-weather/kit';
import type { PlaceGroundData } from '@/lib/mountain-weather/ground-access-types';
import { GROUND_ACCESS_NOTES } from '@/lib/mountain-weather/read-place-ground';
import { USDM_COUNTY_DROUGHT_DEF } from '@/lib/mountain-weather/readers/usdm-county-drought';
import { COMPASS_NE_ESS_DEF } from '@/lib/mountain-weather/readers/compass-ne-ess';
import { formatObservationAge } from '@/lib/mountain-weather/format-display';

/** Road weather stations and air quality near the place (Measured tab). */
export function RoadAndAirSection({ data }: { data: PlaceGroundData }) {
  return (
    <CollapsibleSection title="Roads and air" subtitle="NE Compass road weather · AirNow air quality">
      <SubBlock title="Nearest NE Compass road weather (ESS)">
        {data.compassEss.status === 'error' ? (
          <SourceErrorNote
            label="Compass ESS"
            href={data.compassEss.sourceUrl ?? 'https://nec-por.ne-compass.com/NEC.XmlDataPortal/api/c2c'}
          />
        ) : data.compassEss.data ? (
          <div>
            <p className="font-bold">{data.compassEss.data.name}</p>
            <p className="text-xs text-ink">
              {data.compassEss.data.distanceMi} mi · {data.compassEss.data.lat.toFixed(4)}, {data.compassEss.data.lon.toFixed(4)}
            </p>
            {data.compassEss.data.distant ? (
              <p className="text-xs font-bold text-amber-950">
                Distant station: {data.compassEss.data.distanceMi} mi away, may not reflect conditions here.
              </p>
            ) : null}
            <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              <Field label="Road surface" value={data.compassEss.data.roadSurfaceCond ?? '—'} />
              <Field label="Precip type" value={data.compassEss.data.precipType ?? '—'} />
              <Field label="Air temp" value={data.compassEss.data.fields.airTemp.display ?? '—'} />
              <Field label="Pavement temp" value={data.compassEss.data.fields.pavementTemp.display ?? '—'} />
              <Field label="Dew point" value={data.compassEss.data.fields.dewPoint.display ?? '—'} />
              <Field label="Visibility" value={data.compassEss.data.fields.visibility.display ?? '—'} />
              <Field label="Wind" value={data.compassEss.data.fields.windSpeed.display ?? '—'} />
              <Field label="Wind dir" value={data.compassEss.data.windDir ?? '—'} />
              <Field label="Pressure" value={data.compassEss.data.fields.barometricPressure.display ?? '—'} />
              <Field
                label="Observed"
                value={
                  data.compassEss.data.observedAtEt ??
                  (data.compassEss.data.timestampInterpretation === 'rejected-future' ? 'Suppressed (future)' : '—')
                }
                className="sm:col-span-2"
              />
            </dl>
          </div>
        ) : (
          <p className="text-sm text-ink-2">No road weather station within range has reported in the last 6 hours.</p>
        )}
        <SourceReceipt
          org={COMPASS_NE_ESS_DEF.org}
          product="Road weather stations (ESS)"
          at={data.compassEss.data?.observedAt ?? null}
          verb="observed"
          status={data.compassEss.status}
          href={data.compassEss.sourceUrl ?? COMPASS_NE_ESS_DEF.url}
        />
      </SubBlock>

      <SubBlock title="Air quality">
        {data.airNow.status === 'error' ? (
          <SourceErrorNote label="AirNow air quality" href={data.airNowLink} />
        ) : data.airNow.data?.parameters.length ? (
          <div className="space-y-3">
            {data.airNow.data.parameters.map((row) => (
              <div key={row.parameter}>
                <p className="text-sm font-bold">
                  {row.displayParameter} AQI {row.aqi} ({row.category})
                  {row.distant ? ' · distant monitor' : ''}
                </p>
                <p className="text-xs text-ink-2">
                  {row.siteName ? `${row.siteName} · ` : ''}
                  {row.distanceMi} mi ·{' '}
                  {formatObservationAge(row.ageMinutes)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm">
            {data.airNowKeyConfigured ? 'No air quality monitor in range right now. ' : null}
            <a href={data.airNowLink} className="font-bold underline" target="_blank" rel="noopener noreferrer">
              Check air quality on AirNow.gov ›
            </a>
          </p>
        )}
      </SubBlock>
    </CollapsibleSection>
  );
}

/** Land managers, trail resources and county drought (More tab). */
export function LandAccessSection({ data }: { data: PlaceGroundData }) {
  return (
    <CollapsibleSection title="Land and access" subtitle="Land managers · trail resources · county drought" defaultOpen={false}>
      {data.landLinks.length ? (
        <SubBlock title="Land &amp; trail resources">
          <ul className="list-inside list-disc text-sm">
            {data.landLinks.map((link) => (
              <li key={link.id}>
                <a href={link.href} className="font-bold underline" target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>{' '}
                <span className="text-xs text-ink-2">({link.org})</span>
              </li>
            ))}
          </ul>
        </SubBlock>
      ) : null}

      <SubBlock title="County drought (U.S. Drought Monitor)">
        {data.drought.status === 'error' ? (
          <SourceErrorNote label="County drought" href={data.drought.sourceUrl ?? USDM_COUNTY_DROUGHT_DEF.url} />
        ) : data.drought.data ? (
          <dl className="grid gap-1 text-sm sm:grid-cols-2">
            <Field label="County" value={`${data.drought.data.county}, ${data.drought.data.state}`} />
            <Field label="Week valid" value={`${data.drought.data.validStart} – ${data.drought.data.validEnd}`} />
            <Field label="Map date" value={data.drought.data.mapDate} />
            <Field label="Worst category present" value={data.drought.data.dominant} />
            <Field
              label="Area %"
              value={`None ${data.drought.data.nonePct}% · D0 ${data.drought.data.d0Pct}% · D1 ${data.drought.data.d1Pct}% · D2 ${data.drought.data.d2Pct}% · D3 ${data.drought.data.d3Pct}% · D4 ${data.drought.data.d4Pct}%`}
              className="sm:col-span-2"
            />
          </dl>
        ) : (
          <p className="text-sm text-ink-2">County-level drought information is unavailable for this place.</p>
        )}
        <SourceReceipt
          org={USDM_COUNTY_DROUGHT_DEF.org}
          product="U.S. Drought Monitor, county statistics"
          at={data.drought.issuedAt}
          verb="updated"
          status={data.drought.status}
          expectedEveryHours={USDM_COUNTY_DROUGHT_DEF.expectedEveryHours}
          href={data.drought.sourceUrl ?? USDM_COUNTY_DROUGHT_DEF.url}
        />
      </SubBlock>

    </CollapsibleSection>
  );
}

/** Plain-language notes about how these sources are read, for the About panel. */
export function groundSourceNotes(data: PlaceGroundData): string[] {
  return [
    GROUND_ACCESS_NOTES.dec,
    GROUND_ACCESS_NOTES.baxter,
    GROUND_ACCESS_NOTES.fire,
    GROUND_ACCESS_NOTES.compassCameras,
    data.airQualityNote,
  ].filter(Boolean);
}

function SubBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="tile mt-3 p-3 first:mt-0">
      <h3 className="text-meta font-bold">{title}</h3>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-tag font-bold uppercase tracking-label text-ink-3">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
