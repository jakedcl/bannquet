import type { MountainPlace } from '@/lib/mountain-weather/places';
import type {
  MansfieldStakeSnow,
  MeasuredSnowReport,
  PlaceSnowData,
} from '@/lib/mountain-weather/snow-types';
import { readMansfieldHyd } from '@/lib/mountain-weather/readers/btv-mansfield-hyd';
import { readIemLsrSnow } from '@/lib/mountain-weather/readers/iem-lsr-snow';
import { readNerfcSnowOpsImages } from '@/lib/mountain-weather/readers/nerfc-snow-ops';
import { readNohrscNortheastImages } from '@/lib/mountain-weather/readers/nohrsc-northeast-images';
import { readNohrscStationSnowdepth } from '@/lib/mountain-weather/readers/nohrsc-station-snowdepth';
import { readNwsPnsLatest } from '@/lib/mountain-weather/readers/nws-pns-latest';
import {
  nwsWinterPageUrl,
  readWpcProbSnowImages,
  wssiUrlForOffice,
} from '@/lib/mountain-weather/readers/wpc-pwpf-snow';
import { snowMeasuredBindingsForPlace } from '@/lib/mountain-weather/snow-measured-bindings';

function formatEt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function dedupeReports(rows: MeasuredSnowReport[]): MeasuredSnowReport[] {
  const seen = new Set<string>();
  const out: MeasuredSnowReport[] = [];
  for (const row of rows) {
    if (seen.has(row.dedupeKey)) continue;
    seen.add(row.dedupeKey);
    out.push(row);
  }
  return out;
}

export async function readPlaceSnow(place: MountainPlace): Promise<PlaceSnowData> {
  const bindings = snowMeasuredBindingsForPlace(place.id);
  const [wpc, nerfc, nohrscImgs, nohrscStations, pns, lsr, mansfieldHyd] = await Promise.all([
    readWpcProbSnowImages(),
    readNerfcSnowOpsImages(),
    readNohrscNortheastImages(),
    readNohrscStationSnowdepth(),
    readNwsPnsLatest(place.office),
    readIemLsrSnow(place.office),
    place.id === 'mount-mansfield' ? readMansfieldHyd() : Promise.resolve(null),
  ]);

  const stationMap = new Map((nohrscStations.data ?? []).map((s) => [s.stationId, s]));
  const measuredRaw: MeasuredSnowReport[] = [];
  for (const binding of bindings) {
    const row = stationMap.get(binding.stationId);
    if (!row) continue;
    const dedupeKey = `${binding.source}:${binding.stationId}:${row.reportTimeUtc ?? 'na'}`;
    const value = row.amountIn;
    const valueDisplay =
      value === null ? 'No report' : value === 0 ? '0' : row.amountDisplay;
    measuredRaw.push({
      binding,
      reportTimeUtc: row.reportTimeUtc,
      reportTimeEt: formatEt(row.reportTimeUtc),
      value,
      valueDisplay,
      units: 'in',
      windowLabel:
        binding.element === 'snowdepth'
          ? 'Snow depth (NOHRSC station table snapshot — not 6 h snowfall)'
          : 'Report window per NOHRSC station table',
      element: binding.element,
      dedupeKey,
    });
  }

  let mansfieldStake: MansfieldStakeSnow | null = null;
  if (mansfieldHyd?.data?.row) {
    mansfieldStake = {
      snowNew: mansfieldHyd.data.row.snowNew,
      snowTotal: mansfieldHyd.data.row.snowTotal,
      asOf: mansfieldHyd.issuedAt,
    };
  }

  return {
    office: place.office,
    wpcImages: wpc.data ?? [],
    nerfcImages: nerfc.data ?? [],
    nohrscImages: nohrscImgs.data ?? [],
    winterPageUrl: nwsWinterPageUrl(place.office),
    wssiUrl: wssiUrlForOffice(place.office),
    pns: pns.status === 'ok' ? pns.data : null,
    lsrSnow: lsr.status === 'ok' ? lsr.data ?? [] : [],
    measured: dedupeReports(measuredRaw),
    mansfieldStake,
  };
}

export async function readSnowHub() {
  const [wpc, nerfc, nohrscImgs, mansfieldHyd] = await Promise.all([
    readWpcProbSnowImages(),
    readNerfcSnowOpsImages(),
    readNohrscNortheastImages(),
    readMansfieldHyd(),
  ]);
  return {
    wpc,
    nerfc,
    nohrscImgs,
    mansfieldStake: mansfieldHyd,
    winterLinks: ['BTV', 'ALY', 'GYX', 'CAR'].map((office) => ({
      office,
      winterPageUrl: nwsWinterPageUrl(office),
      wssiUrl: wssiUrlForOffice(office),
    })),
  };
}