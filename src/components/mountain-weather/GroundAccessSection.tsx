import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import type { PlaceGroundData } from '@/lib/mountain-weather/ground-access-types';
import { GROUND_ACCESS_NOTES } from '@/lib/mountain-weather/read-place-ground';
import { USDM_COUNTY_DROUGHT_DEF } from '@/lib/mountain-weather/readers/usdm-county-drought';
import { COMPASS_NE_ESS_DEF } from '@/lib/mountain-weather/readers/compass-ne-ess';

export function GroundAccessSection({ data }: { data: PlaceGroundData }) {
  return (
    <CollapsibleSection title="Ground &amp; access" subtitle="Land managers · drought · roads · air" defaultOpen={false}>
      <p className="text-xs text-gray-700">{GROUND_ACCESS_NOTES.dec}</p>
      <p className="text-xs text-gray-700">{GROUND_ACCESS_NOTES.baxter}</p>
      <p className="text-xs text-gray-700">{GROUND_ACCESS_NOTES.fire}</p>
      <p className="text-xs text-gray-700">{GROUND_ACCESS_NOTES.compassCameras}</p>
      <p className="text-xs text-gray-700">{data.airQualityNote}</p>

      {data.landLinks.length ? (
        <SubBlock title="Land &amp; trail resources">
          <ul className="list-inside list-disc text-sm">
            {data.landLinks.map((link) => (
              <li key={link.id}>
                <a href={link.href} className="font-bold underline" target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>{' '}
                <span className="text-xs text-gray-700">({link.org})</span>
              </li>
            ))}
          </ul>
        </SubBlock>
      ) : null}

      <SubBlock title="County drought (U.S. Drought Monitor)">
        {data.drought.status === 'error' ? (
          <p className="text-sm text-red-800">{data.drought.error}</p>
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
          <p className="text-sm text-gray-700">No county FIPS binding for this place.</p>
        )}
        <p className="mt-1 text-xs text-gray-600">
          <a href={USDM_COUNTY_DROUGHT_DEF.url} className="underline" target="_blank" rel="noopener noreferrer">
            {USDM_COUNTY_DROUGHT_DEF.org}
          </a>
        </p>
      </SubBlock>

      <SubBlock title="Nearest NE Compass road weather (ESS)">
        {data.compassEss.status === 'error' ? (
          <p className="text-sm font-bold text-amber-950">{data.compassEss.error}</p>
        ) : data.compassEss.data ? (
          <div>
            <p className="font-bold">{data.compassEss.data.name}</p>
            <p className="text-xs text-gray-800">
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
              <Field
                label="Timestamp rule"
                value={data.compassEss.data.timestampInterpretation}
                className="sm:col-span-2"
              />
            </dl>
            <p className="text-xs text-gray-700">{data.compassEss.data.timestampNote}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-700">No Compass ESS within range for this state or distance.</p>
        )}
        <p className="mt-1 text-xs text-gray-600">{COMPASS_NE_ESS_DEF.org} · $0 public XML</p>
      </SubBlock>

      <SubBlock title="Air quality">
        {data.airNow.data ? (
          <p className="text-sm font-bold">
            {data.airNow.data.parameter} AQI {data.airNow.data.aqi} ({data.airNow.data.category})
          </p>
        ) : (
          <p className="text-sm">
            <a href={data.airNowLink} className="font-bold underline" target="_blank" rel="noopener noreferrer">
              AirNow.gov
            </a>{' '}
            (no live AQI without API key)
          </p>
        )}
      </SubBlock>
    </CollapsibleSection>
  );
}

function SubBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="retro-box mt-3 border-[#5c3a1e] bg-white/60 p-3">
      <h3 className="text-sm font-bold">{title}</h3>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-bold">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}