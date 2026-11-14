import type {
  AvalancheCenterId,
  AvalancheDangerBand,
  AvalancheMapLayerFeature,
  AvalancheProblem,
  AvalancheProductBundle,
} from '@/lib/mountain-weather/avalanche-types';

const SKIP_PRODUCT_KEYS = new Set([
  'id',
  'danger',
  'forecast_avalanche_problems',
  'forecast_zone',
  'weather_data',
  'avalanche_center',
  'published_time',
  'expires_time',
  'bottom_line',
  'off_season',
  'media',
]);

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function stringOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function numberOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function parseAvalancheMapLayer(text: string, centerId: AvalancheCenterId): AvalancheMapLayerFeature[] {
  const doc = JSON.parse(text) as { features?: unknown[] };
  const out: AvalancheMapLayerFeature[] = [];
  for (const raw of doc.features ?? []) {
    const f = asRecord(raw);
    if (!f) continue;
    const p = asRecord(f.properties);
    if (!p) continue;
    const id = numberOrNull(f.id);
    if (id === null) continue;
    out.push({
      productId: id,
      zoneName: stringOrNull(p.name) ?? 'Unknown zone',
      centerId,
      centerName: stringOrNull(p.center) ?? centerId,
      offSeason: Boolean(p.off_season),
      travelAdvice: stringOrNull(p.travel_advice),
      dangerLabel: stringOrNull(p.danger),
      dangerLevel: numberOrNull(p.danger_level),
      link: stringOrNull(p.link),
      startDate: stringOrNull(p.start_date),
      endDate: stringOrNull(p.end_date),
      state: stringOrNull(p.state),
    });
  }
  return out;
}

function parseDangerBands(raw: unknown): AvalancheDangerBand[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const e = asRecord(entry);
    if (!e) return null;
    return {
      name: stringOrNull(e.name),
      lowerFt: numberOrNull(e.lower),
      upperFt: numberOrNull(e.upper),
      danger: stringOrNull(e.danger),
      dangerLevel: numberOrNull(e.danger_level),
      color: stringOrNull(e.color),
      validDay: stringOrNull(e.valid_day),
    };
  }).filter((b): b is AvalancheDangerBand => b !== null);
}

function parseProblems(raw: unknown): AvalancheProblem[] {
  if (!Array.isArray(raw)) return [];
  const out: AvalancheProblem[] = [];
  for (const entry of raw) {
    const e = asRecord(entry);
    if (!e) continue;
    const aspects: string[] = [];
    const elevations: string[] = [];
    const loc = e.location;
    if (Array.isArray(loc)) {
      for (const row of loc) {
        const r = asRecord(row);
        if (!r) continue;
        const a = stringOrNull(r.aspect);
        const elev = stringOrNull(r.elevation);
        if (a) aspects.push(a);
        if (elev) elevations.push(elev);
      }
    }
    out.push({
      problemType: stringOrNull(e.problem_type) ?? stringOrNull(e.avalanche_problem),
      name: stringOrNull(e.name),
      likelihood: stringOrNull(e.likelihood),
      size: stringOrNull(e.size),
      comment: stringOrNull(e.comment),
      aspects,
      elevations,
      roseData: e.roseData ?? e.rose ?? null,
    });
  }
  return out;
}

export function parseAvalancheProduct(
  text: string,
  mapLayer: AvalancheMapLayerFeature,
): AvalancheProductBundle {
  const doc = JSON.parse(text) as Record<string, unknown>;
  const offSeason = Boolean(doc.off_season) || mapLayer.offSeason;
  const dangerBands = parseDangerBands(doc.danger);
  const problems = parseProblems(doc.forecast_avalanche_problems);
  const extraTopLevel: { key: string; value: unknown }[] = [];
  for (const [key, value] of Object.entries(doc)) {
    if (SKIP_PRODUCT_KEYS.has(key)) continue;
    if (value === null || value === undefined) continue;
    extraTopLevel.push({ key, value });
  }
  const publishedTime = stringOrNull(doc.published_time);
  const expiresTime = stringOrNull(doc.expires_time);
  const lastKnownIssued =
    publishedTime ?? (offSeason ? mapLayer.endDate ?? mapLayer.startDate : null);

  return {
    centerId: mapLayer.centerId,
    productId: mapLayer.productId,
    zoneName: mapLayer.zoneName,
    offSeason,
    publishedTime,
    expiresTime,
    lastKnownIssued,
    bottomLine: stringOrNull(doc.bottom_line),
    discussion: stringOrNull(doc.discussion) ?? stringOrNull(doc.advisory),
    travelAdvice: mapLayer.travelAdvice,
    dangerLabel: dangerBands[0]?.danger ?? mapLayer.dangerLabel,
    dangerLevel: dangerBands[0]?.dangerLevel ?? mapLayer.dangerLevel,
    dangerBands,
    problems,
    weatherData: asRecord(doc.weather_data),
    observations: asRecord(doc.observations) ?? asRecord(doc.weather_observations),
    extraTopLevel,
    forecastZone: doc.forecast_zone ?? null,
    link: mapLayer.link,
    mapLayer,
  };
}