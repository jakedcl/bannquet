import placesJson from '../../../config/mountain-weather/places.json';

export type MountainPlace = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  elevationFt: number | null;
  office: 'BTV' | 'ALY' | 'GYX' | 'CAR';
  isBase: boolean;
};

export type MountainSection = {
  id: string;
  title: string;
  places: MountainPlace[];
};

export type MountainState = {
  code: string;
  name: string;
  sections: MountainSection[];
};

type PlacesFile = {
  version: number;
  states: MountainState[];
};

const FILE = placesJson as PlacesFile;

export const MOUNTAIN_STATES = FILE.states;

export const STATE_CODES = ['ny', 'vt', 'nh', 'me'] as const;
export type MountainStateCode = (typeof STATE_CODES)[number];

export function isMountainStateCode(value: string): value is MountainStateCode {
  return STATE_CODES.includes(value as MountainStateCode);
}

export function getMountainState(code: string): MountainState | null {
  return MOUNTAIN_STATES.find((state) => state.code === code) ?? null;
}

export function getMountainSection(stateCode: string, sectionId: string): MountainSection | null {
  const state = getMountainState(stateCode);
  return state?.sections.find((section) => section.id === sectionId) ?? null;
}

export function getMountainPlace(stateCode: string, sectionId: string, placeId: string): MountainPlace | null {
  const section = getMountainSection(stateCode, sectionId);
  return section?.places.find((place) => place.id === placeId) ?? null;
}

export function allMountainPlaces(): Array<MountainPlace & { state: string; sectionId: string; sectionTitle: string }> {
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
