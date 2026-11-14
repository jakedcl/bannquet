/** NWS station latest: GeoJSON uses `properties`; JSON-LD flattens fields onto the root. */
export function nwsObservationProperties(doc: Record<string, unknown>): Record<string, unknown> {
  const nested = doc.properties;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }

  const skip = new Set([
    '@context',
    '@id',
    '@type',
    'id',
    'type',
    'geometry',
    'feature',
    'features',
    'bbox',
    'context',
  ]);
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(doc)) {
    if (skip.has(key) || key.startsWith('@')) continue;
    out[key] = val;
  }
  return out;
}