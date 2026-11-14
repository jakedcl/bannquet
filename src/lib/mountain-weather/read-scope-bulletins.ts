import type { BulletinOffice } from '@/lib/mountain-weather/bulletin-types';
import {
  bulletinOfficeForSection,
  bulletinOfficeForState,
} from '@/lib/mountain-weather/bulletin-bindings';
import { getMountainSection, getMountainState } from '@/lib/mountain-weather/places';
import { readOfficeBulletins, type OfficeBulletinBundle } from '@/lib/mountain-weather/read-office-bulletins';
import type { MountainStateCode } from '@/lib/mountain-weather/slugs';

const OFFICE_ORDER: BulletinOffice[] = ['BTV', 'ALY', 'GYX', 'CAR', 'BOX', 'OKX'];

function sortOffices(offices: Iterable<BulletinOffice>): BulletinOffice[] {
  const set = new Set(offices);
  return OFFICE_ORDER.filter((o) => set.has(o));
}

export function bulletinOfficesForState(stateCode: MountainStateCode): BulletinOffice[] {
  const homogenous = bulletinOfficeForState(stateCode);
  if (homogenous?.office) return [homogenous.office];
  const state = getMountainState(stateCode);
  if (!state) return [];
  const offices = state.sections.flatMap((section) => section.places.map((place) => place.office));
  return sortOffices(offices);
}

export function bulletinOfficesForSection(stateCode: MountainStateCode, sectionId: string): BulletinOffice[] {
  const homogenous = bulletinOfficeForSection(sectionId);
  if (homogenous?.office) return [homogenous.office];
  const section = getMountainSection(stateCode, sectionId);
  if (!section) return [];
  return sortOffices(section.places.map((place) => place.office));
}

export async function readBulletinsForOffices(offices: BulletinOffice[]): Promise<OfficeBulletinBundle[]> {
  if (offices.length === 0) return [];
  return Promise.all(offices.map((office) => readOfficeBulletins(office)));
}