import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import { NotInIssuanceNote } from '@/components/mountain-weather/NotInIssuanceNote';
import { SourceErrorNote } from '@/components/mountain-weather/SourceErrorNote';
import { Notice } from '@/components/hub/Notice';
import { tagClass } from '@/components/hub/Button';
import { ReadingGrid, ReadingTile, SourceLine, WindArrow } from '@/components/mountain-weather/kit';
import type { PlaceObservationsData, StationObservationBlock } from '@/lib/mountain-weather/read-place-observations';
import type { PlaceStationObservationBinding } from '@/lib/mountain-weather/station-bindings';
import type { SourceDef } from '@/lib/mountain-weather/source-types';
import type { SourceResult } from '@/lib/mountain-weather/source-types';
import {
  formatStationFieldDisplay,
  stationHasReadableMeasurements,
} from '@/lib/mountain-weather/parse/nws-station-units';
import type { NwsStationField } from '@/lib/mountain-weather/mansfield-types';
import {
  ASRC_WHITEFACE_TIMELAPSE_DEF,
  type AscrWhitefaceTimelapse,
} from '@/lib/mountain-weather/readers/asrc-whiteface-timelapse';
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

function kindTitle(
  kind: PlaceStationObservationBinding['kind'],
  stationId: string,
  stationName: string | null,
  network: string,
): string {
  const label = stationName ? `${stationName} (${stationId})` : stationId;
  const net = network ? ` · ${network}` : '';
  if (kind === 'summit') return `Summit station · ${label}${net}`;
  if (kind === 'nearby-higher') return `Nearby higher station · ${label}${net}`;
  if (kind === 'valley') return `Valley / nearby · ${label}${net}`;
  return `Nearby · ${label}${net}`;
}

function placementNote(binding: PlaceStationObservationBinding, placeElevationFt: number | null): string {
  const parts = [`${binding.distanceMi} mi from this place`, binding.network];
  if (binding.stationElevationFt !== null) {
    const src = binding.elevationSource ? ` (${binding.elevationSource})` : '';
    parts.push(`${binding.stationElevationFt.toLocaleString('en-US')} ft station elevation${src}`);
  }
  if (placeElevationFt !== null && binding.elevationDiffFt !== null) {
    if (binding.kind === 'nearby-higher' && binding.elevationDiffFt !== null && binding.elevationDiffFt < 0) {
      parts.push(
        `${Math.abs(binding.elevationDiffFt).toLocaleString('en-US')} ft higher than catalog (${placeElevationFt.toLocaleString('en-US')} ft)`,
      );
    } else if (binding.kind === 'valley' || binding.elevationDiffFt >= 700) {
      parts.push(
        `${binding.elevationDiffFt.toLocaleString('en-US')} ft below catalog summit (${placeElevationFt.toLocaleString('en-US')} ft)`,
      );
    } else if (binding.elevationDiffFt <= 0) {
      parts.push(
        `station is ${Math.abs(binding.elevationDiffFt).toLocaleString('en-US')} ft above catalog elevation`,
      );
    } else {
      parts.push(`${binding.elevationDiffFt.toLocaleString('en-US')} ft below catalog elevation`);
    }
  }
  return parts.join(' · ');
}

function SourceFooter({ def, issuedAt, sourceUrl }: { def: SourceDef; issuedAt: string | null; sourceUrl: string }) {
  return (
    <p className="text-xs text-ink-2">
      {def.org} · {def.kind} · measured · Issued {formatEt(issuedAt)} ET ·{' '}
      <a href={sourceUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
        Source
      </a>
    </p>
  );
}

function StationBlock({
  block,
  placeElevationFt,
}: {
  block: StationObservationBlock;
  placeElevationFt: number | null;
}) {
  const { binding, def, result } = block;
  const stale = result.status === 'stale' ? ' · stale' : '';

  return (
    <CollapsibleSection
      title={kindTitle(binding.kind, binding.stationId, binding.stationName, binding.network)}
      subtitle={`${def.org} · measured${stale}`}
      defaultOpen={binding.kind === 'summit'}
    >
      <p className="mb-2 flex flex-wrap items-center gap-2">
        <span className={tagClass(binding.kind === 'summit' || binding.kind === 'nearby-higher' ? 'green' : 'arrow')}>
          {binding.kind === 'summit' ? 'Summit' : binding.kind === 'nearby-higher' ? 'Higher' : binding.kind === 'valley' ? 'Valley' : 'Nearby'}
        </span>
        <span className="text-caption text-ink-2">{placementNote(binding, placeElevationFt)}</span>
      </p>
      {result.data?.timestamp ? <div className="mb-2"><SourceLine source="Last report" at={result.data.timestamp} verb="observed" /></div> : null}
      {(binding.kind === 'valley' || binding.kind === 'base') && binding.distanceMi > 25 ? (
        <Notice tone="warn">Distant station: {binding.distanceMi} mi away, may not reflect conditions here.</Notice>
      ) : null}
      {result.status === 'not-in-issuance' ? (
        <NotInIssuanceNote
          label="Weather observation"
          href={result.sourceUrl ?? 'https://api.weather.gov/'}
          latestIssuanceEt={formatEt(result.issuedAt)}
        />
      ) : result.status === 'error' || !result.data ? (
        <SourceErrorNote
          label="Weather observation"
          href={result.sourceUrl ?? 'https://api.weather.gov/'}
          serverError={result.error}
        />
      ) : (
        <>
          {!stationHasReadableMeasurements(result.data.fields) ? (
            <Notice>No measured readings in the latest observation report.</Notice>
          ) : null}
          {(() => {
            const text = result.data.fields.find((f) => f.key === 'textDescription');
            return text?.value ? <p className="text-meta font-bold">{text.value}</p> : null;
          })()}
          <KeyReadings fields={result.data.fields} />
          <CollapsibleSection title="All readings" subtitle="Every element in the report, with its NWS quality check" defaultOpen={false}>
            <ul className="ui-list text-meta">
              {result.data.fields.map((f) => (
                <li key={f.key} className="flex flex-wrap justify-between gap-x-3 py-1.5">
                  <span className="font-bold">{f.label}</span>
                  <span className="text-right">
                    {f.value === null || f.value === undefined || f.value === '' ? (
                      <span className="text-ink-2">No reading in last report</span>
                    ) : (
                      formatStationFieldDisplay(f)
                    )}
                    {f.observedAt ? <span className="text-ink-2"> · {earlierNote(f)}</span> : null}
                    {f.qcFailed ? (
                      <span className="text-ink-2"> · failed NWS quality check</span>
                    ) : f.qualityControl ? (
                      <span className="text-ink-2"> · QC {f.qualityControl}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
          {result.data.timestamp ? (
            <p className="text-xs text-ink-2">Observation time {formatEt(result.data.timestamp)} ET</p>
          ) : (
            <p className="text-xs text-ink-2">Observation time: null</p>
          )}
        </>
      )}
      <SourceFooter def={def} issuedAt={result.issuedAt} sourceUrl={result.sourceUrl} />
    </CollapsibleSection>
  );
}

function AsrcBlock({
  def,
  result,
}: {
  def: SourceDef;
  result: SourceResult<AscrWhitefaceTimelapse>;
}) {
  return (
    <CollapsibleSection title="Whiteface summit timelapse (ASRC)" subtitle={`${def.org} · measured`} defaultOpen>
      {result.status === 'error' || !result.data ? (
        <SourceErrorNote label="Whiteface timelapse" href={result.sourceUrl ?? ASRC_WHITEFACE_TIMELAPSE_DEF.url} />
      ) : (
        <>
          <video
            className="max-h-72 w-full well bg-black"
            controls
            playsInline
            preload="metadata"
            src={result.data.mp4Url}
          >
            Timelapse MP4
          </video>
          <p className="text-xs text-ink-2">
            Summit cam timelapse from UAlbany ASRC.{' '}
            <a href={result.data.dashboardUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
              ASRC Whiteface dashboard
            </a>
          </p>
          {result.data.dataFeedStatus === 'unavailable' ? (
            <p className="text-xs text-ink-2">{result.data.dataFeedNote}</p>
          ) : null}
        </>
      )}
      <SourceFooter def={def} issuedAt={result.issuedAt} sourceUrl={result.sourceUrl} />
    </CollapsibleSection>
  );
}

export function ObservationsSection({
  data,
  placeElevationFt,
}: {
  data: PlaceObservationsData | null;
  placeElevationFt: number | null;
}) {
  if (!data) return null;
  if (data.stations.length === 0 && !data.asrc) return null;

  return (
  <>
    <p className="text-meta text-ink-2">
      Measured readings from government and university stations. Each station says whether it is on the summit or in the valley.
    </p>
    {data.stations.map((block) => (
      <StationBlock key={block.binding.stationId + block.binding.kind} block={block} placeElevationFt={placeElevationFt} />
    ))}
    {data.asrc ? <AsrcBlock def={ASRC_WHITEFACE_TIMELAPSE_DEF} result={data.asrc} /> : null}
  </>
  );
}

const TILE_KEYS: Array<{ key: string; label: string }> = [
  { key: 'temperature', label: 'Temp' },
  { key: 'windSpeed', label: 'Wind' },
  { key: 'windGust', label: 'Gusts' },
  { key: 'relativeHumidity', label: 'Humidity' },
  { key: 'visibility', label: 'Visibility' },
  { key: 'barometricPressure', label: 'Pressure' },
  { key: 'dewpoint', label: 'Dewpoint' },
  { key: 'windChill', label: 'Wind chill' },
];

/** "at 7:05 PM" when a reading came from an earlier report than the newest one. */
function earlierNote(field: NwsStationField): string | undefined {
  if (!field.observedAt) return undefined;
  const d = new Date(field.observedAt);
  if (Number.isNaN(d.getTime())) return undefined;
  return `At ${d.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })}`;
}

function hasValue(field: NwsStationField | undefined): field is NwsStationField {
  return Boolean(field) && field!.value !== null && field!.value !== undefined && field!.value !== '' && !field!.qcFailed;
}

/** The main readings as tiles; a missing reading says so. */
function KeyReadings({ fields }: { fields: NwsStationField[] }) {
  const byKey = new Map(fields.map((f) => [f.key, f]));
  const dir = byKey.get('windDirection');
  const tiles = TILE_KEYS.filter(({ key }) => byKey.has(key));
  if (tiles.length === 0) return null;
  return (
    <div className="mb-2">
      <ReadingGrid>
        {tiles.map(({ key, label }) => {
          const field = byKey.get(key);
          if (!hasValue(field)) return <ReadingTile key={key} label={label} value="—" sub="No reading" />;
          if (key === 'windSpeed') {
            const deg = hasValue(dir) ? Number(dir.value) : null;
            return (
              <ReadingTile
                key={key}
                label={label}
                value={
                  <span className="inline-flex items-center gap-1">
                    <WindArrow from={deg} className="h-4 w-4" />
                    {formatStationFieldDisplay(field)}
                  </span>
                }
                sub={
                  [deg !== null && Number.isFinite(deg) ? `From ${Math.round(deg)}°` : null, earlierNote(field)]
                    .filter(Boolean)
                    .join(' · ') || undefined
                }
              />
            );
          }
          return <ReadingTile key={key} label={label} value={formatStationFieldDisplay(field)} sub={earlierNote(field)} />;
        })}
      </ReadingGrid>
    </div>
  );
}
