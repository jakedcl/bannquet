import placesJson from '../../../config/mountain-weather/places.json';
import type { MountainWfo } from '@/lib/mountain-weather/nws-office';
import { canonicalPlaceId, resolveMountainStateSlug, type MountainStateCode } from '@/lib/mountain-weather/slugs';

export type MountainPlace = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  elevationFt: number | null;
  /** NWS WFO from api.weather.gov/points (properties.cwa). */
  office: MountainWfo;
  gridId?: string;
  isBase: boolean;
};

export type MountainSection = {
  id: string;
  title: string;
  places: MountainPlace[];
};

export type MountainState = {
  code: MountainStateCode;
  name: string;
  sections: MountainSection[];
};

type PlacesFile = {
  version: number;
  states: MountainState[];
};

const FILE = placesJson as PlacesFile;

export const MOUNTAIN_STATES = FILE.states;

export {
  STATE_CODES,
  type MountainStateCode,
  mountainStateSlug,
  resolveMountainStateSlug,
  isMountainStateSlug,
} from '@/lib/mountain-weather/slugs';

export function isMountainStateCode(value: string): value is MountainStateCode {
  return resolveMountainStateSlug(value) !== null;
}

export function getMountainState(codeOrSlug: string): MountainState | null {
  const code = resolveMountainStateSlug(codeOrSlug);
  if (!code) return null;
  return MOUNTAIN_STATES.find((state) => state.code === code) ?? null;
}

export function getMountainSection(stateCodeOrSlug: string, sectionId: string): MountainSection | null {
  const state = getMountainState(stateCodeOrSlug);
  return state?.sections.find((section) => section.id === sectionId) ?? null;
}

export function getMountainPlace(stateCodeOrSlug: string, sectionId: string, placeId: string): MountainPlace | null {
  const section = getMountainSection(stateCodeOrSlug, sectionId);
  const wanted = canonicalPlaceId(placeId);
  return section?.places.find((place) => place.id === wanted) ?? null;
}

export function findMountainPlaceCatalogEntry(
  placeId: string,
): (MountainPlace & { state: MountainStateCode; sectionId: string; sectionTitle: string }) | null {
  const wanted = canonicalPlaceId(placeId);
  return allMountainPlaces().find((place) => place.id === wanted) ?? null;
}

export function allMountainPlaces(): Array<MountainPlace & { state: MountainStateCode; sectionId: string; sectionTitle: string }> {
  return MOUNTAIN_STATES.flatMap((state) => state.sections.flatMap((section) => section.places.map((place) => ({
    ...place,
    state: state.code,
    sectionId: section.id,
    sectionTitle: section.title,
  }))));
}

export function placeCount(): number {
  return allMountainPlaces().length;
}

export function summitOfSection(section: MountainSection): MountainPlace | null {
  const summits = section.places.filter((place) => !place.isBase);
  const pool = summits.length > 0 ? summits : section.places;
  if (pool.length === 0) return null;
  return pool.reduce((best, place) => {
    const elev = place.elevationFt ?? 0;
    const bestElev = best.elevationFt ?? 0;
    return elev >= bestElev ? place : best;
  });
}
