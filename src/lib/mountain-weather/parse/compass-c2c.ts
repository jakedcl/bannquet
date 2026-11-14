import { XMLParser } from 'fast-xml-parser';
import {
  decodeCompassEssFields,
  tmddAirTempFahrenheit,
  type CompassEssFields,
} from '@/lib/mountain-weather/parse/compass-ess-units';

export type CompassTimestampInterpretation =
  | 'clock-as-utc'
  | 'labeled-offset'
  | 'rejected-future'
  | 'unconfirmed';

export type CompassEss = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  roadSurfaceCond: string | null;
  precipType: string | null;
  windDir: string | null;
  timestampRaw: string | null;
  fields: CompassEssFields;
  airTempF: number | null;
  pavementTempF: number | null;
  windSpeed: number | null;
};

export type CompassCamera = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  status: string | null;
  imageUrl: string | null;
};

function compassCoord(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n / 1_000_000;
}

function one<T>(value: T | T[] | undefined): T | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

const FUTURE_SLACK_MS = 30 * 60 * 1000;

export function parseClockUtcFromTimestamp(raw: string): Date | null {
  const m = raw.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
  if (!m) return null;
  const d = new Date(`${m[1]}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function resolveCompassTimestamp(
  raw: string | null,
  fetchAt: Date,
  liveConfirmed: boolean,
): {
  instant: Date | null;
  etLabel: string | null;
  interpretation: CompassTimestampInterpretation;
  note: string;
} {
  if (!raw) {
    return {
      instant: null,
      etLabel: null,
      interpretation: 'unconfirmed',
      note: 'No ESS timestamp published.',
    };
  }
  const labeled = new Date(raw);
  const fetchMs = fetchAt.getTime();
  const labeledFuture = !Number.isNaN(labeled.getTime()) && labeled.getTime() - fetchMs > FUTURE_SLACK_MS;
  const asUtc = parseClockUtcFromTimestamp(raw);
  const utcDelta = asUtc ? Math.abs(asUtc.getTime() - fetchMs) : Infinity;
  const utcFixesFuture =
    labeledFuture && asUtc !== null && utcDelta <= FUTURE_SLACK_MS && asUtc.getTime() <= fetchMs + FUTURE_SLACK_MS;

  if (utcFixesFuture) {
    const et = asUtc!.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    return {
      instant: asUtc,
      etLabel: `${et} ET`,
      interpretation: liveConfirmed ? 'clock-as-utc' : 'unconfirmed',
      note: liveConfirmed
        ? `Compared ESS timestamps to the HTTP Date at fetch; values ~5 h ahead of real time used clock-as-UTC (ignored ${raw.slice(-6)} offset).`
        : `Clock-as-UTC applied because labeled offset would be >30 min in the future vs fetch time; live feed was not confirmed this run.`,
    };
  }

  if (!Number.isNaN(labeled.getTime()) && !labeledFuture) {
    const et = labeled.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    return {
      instant: labeled,
      etLabel: `${et} ET`,
      interpretation: liveConfirmed ? 'labeled-offset' : 'unconfirmed',
      note: liveConfirmed
        ? 'Labeled offset timestamp matched fetch time within 30 minutes.'
        : 'Used ISO offset as published; not compared to live HTTP Date (feed down or unchecked).',
    };
  }

  if (labeledFuture) {
    return {
      instant: null,
      etLabel: null,
      interpretation: 'rejected-future',
      note: 'Timestamp would read >30 min in the future; suppressed rather than mislabel.',
    };
  }

  return {
    instant: null,
    etLabel: raw,
    interpretation: 'unconfirmed',
    note: 'Could not parse timestamp.',
  };
}

/** @deprecated use resolveCompassTimestamp */
export function compassTimestampToEtLabel(raw: string | null): { iso: string | null; etLabel: string | null; note: string } {
  const resolved = resolveCompassTimestamp(raw, new Date(), false);
  return {
    iso: resolved.instant?.toISOString() ?? null,
    etLabel: resolved.etLabel,
    note: resolved.note,
  };
}

export function parseCompassEssXml(text: string): CompassEss[] {
  const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
  const doc = parser.parse(text) as { status?: { essData?: { net?: { ess?: unknown } } } };
  const essRows = doc.status?.essData?.net?.ess;
  const list = essRows ? (Array.isArray(essRows) ? essRows : [essRows]) : [];
  return list
    .map((row) => {
      const r = row as Record<string, unknown>;
      const lat = compassCoord(r.lat);
      const lon = compassCoord(r.lon);
      if (lat === null || lon === null) return null;
      const idRaw = r.id ?? (r as Record<string, unknown>)['@_id'];
      const fields = decodeCompassEssFields(r);
      const windRaw = fields.windSpeed.raw;
      return {
        id: String(idRaw ?? ''),
        name: String(r.name ?? ''),
        lat,
        lon,
        roadSurfaceCond: r.roadSurfaceCond != null ? String(r.roadSurfaceCond) : null,
        precipType: r.precipType != null ? String(r.precipType) : null,
        windDir: r.windDir != null ? String(r.windDir) : null,
        timestampRaw: r.timestamp != null ? String(r.timestamp) : null,
        fields,
        airTempF: tmddAirTempFahrenheit(r.airTemp),
        pavementTempF: tmddAirTempFahrenheit(r.pavementTemp),
        windSpeed: windRaw,
      };
    })
    .filter((row): row is CompassEss => Boolean(row && row.id));
}

export function parseCompassCctvXml(text: string): CompassCamera[] {
  const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
  const doc = parser.parse(text) as { status?: { cctvSnapshotData?: { net?: { cctv?: unknown } } } };
  const rows = one(doc.status?.cctvSnapshotData?.net?.cctv as unknown[] | Record<string, unknown> | undefined);
  const list = rows ? (Array.isArray(rows) ? rows : [rows]) : [];
  return list
    .map((row) => {
      const r = row as Record<string, unknown>;
      const lat = compassCoord(r.lat);
      const lon = compassCoord(r.lon);
      if (lat === null || lon === null) return null;
      const snap = one(r.snapshot as Record<string, unknown> | Record<string, unknown>[] | undefined) as Record<string, unknown> | undefined;
      return {
        id: String(r.id ?? (r as Record<string, unknown>)['@_id'] ?? ''),
        name: String(r.name ?? ''),
        lat,
        lon,
        status: r.status != null ? String(r.status) : null,
        imageUrl: snap?.imageURL != null ? String(snap.imageURL) : snap?.imageUrl != null ? String(snap.imageUrl) : null,
      };
    })
    .filter((row): row is CompassCamera => Boolean(row && row.id));
}