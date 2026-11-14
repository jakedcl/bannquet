import { XMLParser } from 'fast-xml-parser';
import type { AllLocationsMarker } from '@/lib/mountain-weather/all-locations-types';
import { detectSeasonalOffMessage } from '@/lib/mountain-weather/parse/seasonal-off';

const parser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
  isArray: (name) => name === 'MARKER',
});

function parseLatLon(marker: Record<string, unknown>): { lat: number | null; lon: number | null } {
  const lat = Number(marker.LAT);
  const lon = Number(marker.LON);
  return {
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
  };
}

function cleanNarrative(text: string): string {
  const lines = text.split('\n');
  const body = lines.slice(1).join('\n').trim();
  return body.replace(/\s+/g, ' ').trim();
}

export function parseAllLocationsXml(xml: string): Record<string, AllLocationsMarker> {
  const doc = parser.parse(xml) as { MARKERS?: { MARKER?: unknown } };
  const markers = doc.MARKERS?.MARKER;
  const list = Array.isArray(markers) ? markers : markers ? [markers] : [];
  const out: Record<string, AllLocationsMarker> = {};
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const marker = entry as Record<string, unknown>;
    const location = String(marker.LOCATION ?? '').trim().toUpperCase();
    if (!location) continue;
    const type = marker.TYPE ? String(marker.TYPE).trim() : null;
    const text = String(marker.TEXT ?? '');
    const { lat, lon } = parseLatLon(marker);
    const seasonalMessage = detectSeasonalOffMessage(text);
    out[location] = {
      type,
      location,
      lat,
      lon,
      narrative: cleanNarrative(text),
      seasonalOff: seasonalMessage !== null,
      seasonalMessage,
    };
  }
  return out;
}
