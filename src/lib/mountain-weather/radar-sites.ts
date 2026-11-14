import type { MountainPlace } from '@/lib/mountain-weather/places';

/** Nearest WSR-88D site for NWS ridge loops, keyed by WFO. */
const RADAR_BY_OFFICE: Record<MountainPlace['office'], string> = {
  BTV: 'KCXX',
  ALY: 'KENX',
  GYX: 'KGYX',
  CAR: 'KCBW',
  BOX: 'KBOX',
  OKX: 'KOKX',
};

const RADAR_LABELS: Record<string, string> = {
  KCXX: 'Burlington, VT (KCXX)',
  KENX: 'Albany, NY (KENX)',
  KGYX: 'Portland, ME (KGYX)',
  KCBW: 'Caribou, ME (KCBW)',
  KBOX: 'Boston, MA (KBOX)',
  KOKX: 'New York City, NY (KOKX)',
};

export function radarSiteForOffice(office: MountainPlace['office']): string {
  return RADAR_BY_OFFICE[office];
}

export function radarSiteLabel(siteId: string): string {
  return RADAR_LABELS[siteId] ?? siteId;
}

export function nwsRidgeLoopUrl(siteId: string): string {
  return `https://radar.weather.gov/ridge/standard/${siteId}_loop.gif`;
}

export const NWS_RIDGE_NE_MOSAIC_URL = 'https://radar.weather.gov/ridge/standard/NORTHEAST_loop.gif';