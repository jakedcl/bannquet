/** WFO ids from api.weather.gov/points properties.cwa for mountain-weather places. */
export const MOUNTAIN_WFO_CODES = ['BTV', 'ALY', 'GYX', 'CAR', 'BOX', 'OKX'] as const;

export type MountainWfo = (typeof MOUNTAIN_WFO_CODES)[number];

export function isMountainWfo(value: string): value is MountainWfo {
  return (MOUNTAIN_WFO_CODES as readonly string[]).includes(value);
}

export function afdSourceDef(office: MountainWfo) {
  const orgNames: Record<MountainWfo, string> = {
    BTV: 'National Weather Service Burlington',
    ALY: 'National Weather Service Albany',
    GYX: 'National Weather Service Gray',
    CAR: 'National Weather Service Caribou',
    BOX: 'National Weather Service Boston',
    OKX: 'National Weather Service New York',
  };
  return {
    id: `nws-${office.toLowerCase()}-afd`,
    org: orgNames[office],
    kind: 'official' as const,
    terms: 'reuse-ok' as const,
    url: `https://api.weather.gov/products/types/AFD/locations/${office}`,
    ttlSeconds: 1800,
    expectedEveryHours: 12,
  };
}

export function ghwoUrl(office: MountainWfo): string {
  return `https://www.weather.gov/erh/ghwo?wfo=${office.toLowerCase()}`;
}