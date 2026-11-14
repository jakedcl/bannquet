import { XMLParser } from 'fast-xml-parser';

export type CompassEss = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  roadSurfaceCond: string | null;
  airTempF: number | null;
  pavementTempF: number | null;
  windSpeed: number | null;
  windDir: string | null;
  timestampRaw: string | null;
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

/** NE Compass timestamps carry a numeric offset (e.g. -05:00 in November = EST). Treat as offset-local, not UTC. */
export function compassTimestampToEtLabel(raw: string | null): { iso: string | null; etLabel: string | null; note: string } {
  if (!raw) {
    return { iso: null, etLabel: null, note: 'No timestamp published.' };
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return { iso: null, etLabel: raw, note: 'Could not parse timestamp; showing raw value.' };
  }
  const et = parsed.toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' });
  return {
    iso: parsed.toISOString(),
    etLabel: `${et} (America/New_York)`,
    note:
      'Compass ESS timestamps include a numeric offset in the XML (e.g. -05:00). We parse them as offset-local instants, not as UTC falsely labeled -05:00.',
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
      return {
        id: String(idRaw ?? ''),
        name: String(r.name ?? ''),
        lat,
        lon,
        roadSurfaceCond: r.roadSurfaceCond != null ? String(r.roadSurfaceCond) : null,
        airTempF: Number.isFinite(Number(r.airTemp)) ? Number(r.airTemp) : null,
        pavementTempF: Number.isFinite(Number(r.pavementTemp)) ? Number(r.pavementTemp) : null,
        windSpeed: Number.isFinite(Number(r.windSpeed)) ? Number(r.windSpeed) : null,
        windDir: r.windDir != null ? String(r.windDir) : null,
        timestampRaw: r.timestamp != null ? String(r.timestamp) : null,
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