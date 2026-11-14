import bindingsJson from '../../../config/mountain-weather/bulletin-bindings.json';
import type { BulletinOffice } from '@/lib/mountain-weather/bulletin-types';
import type { MountainStateCode } from '@/lib/mountain-weather/slugs';

type PlaceBinding = {
  office: BulletinOffice;
  bindReason: string;
};

type ScopeBinding = {
  office: BulletinOffice;
  bindReason: string;
} | null;

type BulletinBindingsFile = {
  version: number;
  places: Record<string, PlaceBinding>;
  states: Record<MountainStateCode, ScopeBinding>;
  sections: Record<string, Exclude<ScopeBinding, null>>;
  unboundScopes: Record<string, string>;
};

const FILE = bindingsJson as BulletinBindingsFile;

export function bulletinOfficeForPlace(placeId: string): PlaceBinding | null {
  return FILE.places[placeId] ?? null;
}

export function bulletinOfficeForState(stateCode: MountainStateCode): Exclude<ScopeBinding, undefined> {
  return FILE.states[stateCode] ?? null;
}

export function bulletinOfficeForSection(sectionId: string): Exclude<ScopeBinding, null> | undefined {
  return FILE.sections[sectionId];
}

export function bulletinUnboundScopeNotes(): Record<string, string> {
  return FILE.unboundScopes;
}