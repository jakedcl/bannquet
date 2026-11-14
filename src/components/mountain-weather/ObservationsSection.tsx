import { CollapsibleSection } from '@/components/mountain-weather/CollapsibleSection';
import type { PlaceObservationsData, StationObservationBlock } from '@/lib/mountain-weather/read-place-observations';
import type { PlaceStationObservationBinding } from '@/lib/mountain-weather/station-bindings';
import type { SourceDef } from '@/lib/mountain-weather/source-types';
import type { SourceResult } from '@/lib/mountain-weather/source-types';
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

function kindTitle(kind: PlaceStationObservationBinding['kind'], stationId: string, stationName: string | null): string {
  const label = stationName ? `${stationName} (${stationId})` : stationId;
  if (kind === 'summit') return `Summit station · ${label}`;
  if (kind === 'valley') return `Valley / nearby METAR · ${label}`;
  return `Nearby METAR · ${label}`;
}

function placementNote(binding: PlaceStationObservationBinding, placeElevationFt: number | null): string {
  const parts = [`${binding.distanceMi} mi from this place`];
  if (binding.stationElevationFt !== null) {
    parts.push(`${binding.stationElevationFt.toLocaleString('en-US')} ft station elevation`);
  }
  if (placeElevationFt !== null && binding.elevationDiffFt !== null) {
    if (binding.kind === 'valley' || binding.elevationDiffFt >= 700) {
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
    <p className="text-xs text-gray-700">
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
      title={kindTitle(binding.kind, binding.stationId, binding.stationName)}
      subtitle={`${def.org} · measured${stale}`}
      defaultOpen={binding.kind === 'summit'}
    >
      <p className="text-xs text-gray-800">{placementNote(binding, placeElevationFt)}</p>
      <p className="text-xs text-gray-600">{binding.bindReason}</p>
      {result.status === 'error' || !result.data ? (
        <p className="text-sm font-bold">{result.error ?? 'Observation did not load.'}</p>
      ) : (
        <>
          {(() => {
            const text = result.data.fields.find((f) => f.key === 'textDescription');
            return text?.value ? <p className="text-sm font-bold">{text.value}</p> : null;
          })()}
          <ul className="grid gap-1 sm:grid-cols-2">
            {result.data.fields.map((f) => (
              <li key={f.key}>
                <span className="font-bold">{f.label}:</span>{' '}
                {f.value === null ? (
                  <span className="text-gray-700">null</span>
                ) : (
                  `${f.value}${f.unit ? ` ${f.unit}` : ''}`
                )}
                {f.qcFailed ? (
                  <span className="text-gray-700"> (failed NWS quality check)</span>
                ) : f.qualityControl ? (
                  <span className="text-gray-600"> (QC {f.qualityControl})</span>
                ) : null}
              </li>
            ))}
          </ul>
          {result.data.timestamp ? (
            <p className="text-xs text-gray-700">Observation time {formatEt(result.data.timestamp)} ET</p>
          ) : (
            <p className="text-xs text-gray-700">Observation time: null</p>
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
        <p className="text-sm font-bold">{result.error ?? 'Timelapse unavailable.'}</p>
      ) : (
        <>
          <video
            className="max-h-72 w-full border border-gray-400 bg-black"
            controls
            playsInline
            preload="metadata"
            src={result.data.mp4Url}
          >
            Timelapse MP4
          </video>
          <p className="text-xs text-gray-700">
            Summit cam timelapse from UAlbany ASRC.{' '}
            <a href={result.data.dashboardUrl} className="font-bold underline" target="_blank" rel="noopener noreferrer">
              ASRC Whiteface dashboard
            </a>
          </p>
          {result.data.dataFeedStatus === 'unavailable' ? (
            <p className="text-xs text-gray-700">{result.data.dataFeedNote}</p>
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
    <h2 className="text-lg font-bold uppercase tracking-wide text-gray-900">Observations</h2>
    <p className="text-sm text-gray-700">
      Measured conditions from government or university stations. Forecasts stay in sections above.
    </p>
    {data.stations.map((block) => (
      <StationBlock key={block.binding.stationId + block.binding.kind} block={block} placeElevationFt={placeElevationFt} />
    ))}
    {data.asrc ? <AsrcBlock def={ASRC_WHITEFACE_TIMELAPSE_DEF} result={data.asrc} /> : null}
  </>
  );
}