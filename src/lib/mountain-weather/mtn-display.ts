import { formatMtnHourEt, addHoursUtc } from '@/lib/mountain-weather/parse/mtn-time';
import type {
  MtnAmount,
  MtnEnhancedPeriod,
  MtnPointBundle,
  MtnStandardPoint,
} from '@/lib/mountain-weather/mtn-point-types';

export type MtnHourlyDisplayRow = MtnEnhancedPeriod & {
  gustMph: number | null;
  lightning: string | null;
};

export type MtnAccumBlock = {
  label: string;
  snowIn: MtnAmount;
  iceIn: MtnAmount;
};

export type MtnDisplayMeta = {
  showGust: boolean;
  showIce: boolean;
  showLightning: boolean;
  showSnowBlocks: boolean;
  nwsElevationFt: number | null;
  issuedLine: string | null;
};

function tabularSlot(index: number): number {
  return Math.floor(index / 3);
}

function mergeFromStandard(
  hourly: MtnEnhancedPeriod[],
  standard: MtnStandardPoint | null,
): MtnHourlyDisplayRow[] {
  const tabular = standard?.tabular ?? [];
  return hourly.map((row, index) => {
    const slot = tabular[tabularSlot(index)];
    return {
      ...row,
      gustMph: row.gustMph ?? slot?.gustMph ?? null,
      lightning: slot?.lightning ?? null,
    };
  });
}

function snowIceBlocks(bundle: MtnPointBundle): MtnAccumBlock[] {
  const enhanced = bundle.enhanced;
  const standard = bundle.standard;
  const snow =
    enhanced?.snowBlocks ??
    standard?.snowBlocks ??
    [];
  const ice =
    enhanced?.iceBlocks ??
    standard?.iceBlocks ??
    [];
  const count = Math.max(snow.length, ice.length);
  if (count === 0) return [];
  const start = enhanced?.cycleStart ?? null;
  const blocks: MtnAccumBlock[] = [];
  for (let i = 0; i < count; i++) {
    const label = start
      ? formatMtnHourEt(addHoursUtc(start, i * 6))
      : standard?.snowBlockLabels?.[i] ?? `+${i * 6}h`;
    blocks.push({
      label,
      snowIn: snow[i] ?? null,
      iceIn: ice[i] ?? null,
    });
  }
  return blocks;
}

export function buildMtnDisplay(bundle: MtnPointBundle): {
  meta: MtnDisplayMeta;
  hourly: MtnHourlyDisplayRow[];
  snowIce: MtnAccumBlock[];
} {
  const stdTab = bundle.standard?.tabular ?? [];
  const hourlyRaw = bundle.enhanced?.hourly ?? [];
  let hourly: MtnHourlyDisplayRow[];
  if (hourlyRaw.length > 0) {
    hourly = mergeFromStandard(hourlyRaw, bundle.standard);
  } else if (bundle.standard?.tabular.length) {
    hourly = bundle.standard.tabular.map((row) => ({
      time: new Date(NaN),
      label: row.label,
      tempF: row.tempF,
      windDirDeg: null,
      windDir: row.windDir,
      windMph: row.windMph,
      gustMph: row.gustMph,
      sky: row.sky,
      windChillF: row.windChillF,
      precipPct: row.precipPct,
      lightning: row.lightning,
    }));
  } else {
    hourly = [];
  }

  const showGust =
    hourly.some((r) => r.gustMph !== null) || stdTab.some((r) => r.gustMph !== null);
  const snowIce = snowIceBlocks(bundle);
  const showIce =
    snowIce.some((b) => b.iceIn !== null) ||
    (bundle.enhanced?.iceBlocks?.length ?? 0) > 0 ||
    (bundle.standard?.iceBlocks?.length ?? 0) > 0;
  const showLightning =
    stdTab.some((r) => r.lightning !== null) || hourly.some((r) => r.lightning !== null);
  const showSnowBlocks = snowIce.some((b) => b.snowIn !== null);

  const nwsElevationFt =
    bundle.standard?.elevationFt ?? bundle.enhanced?.elevationFt ?? null;
  const issuedLine = bundle.standard?.issuedLine ?? null;

  return {
    meta: {
      showGust,
      showIce,
      showLightning,
      showSnowBlocks,
      nwsElevationFt,
      issuedLine,
    },
    hourly,
    snowIce,
  };
}

export function fmtMtnAmount(value: MtnAmount, suffix = '"'): string {
  if (value === null || value === undefined) return '—';
  if (value === 'T') return 'Trace';
  return `${value}${suffix}`;
}

export function fmtMtnLightning(value: string | null): string {
  if (!value || value === 'NR') return '—';
  return value;
}
