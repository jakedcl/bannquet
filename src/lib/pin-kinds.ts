export const PIN_KINDS = [
  'summit',
  'trailhead',
  'camp',
  'water',
  'view',
  'hazard',
  'put_in',
  'crag',
  'other',
] as const;

export type PinKind = (typeof PIN_KINDS)[number];

export const PIN_KIND_LABELS: Record<PinKind, string> = {
  summit: 'Summit',
  trailhead: 'Trailhead',
  camp: 'Camp',
  water: 'Water',
  view: 'View',
  hazard: 'Hazard',
  put_in: 'Put-in',
  crag: 'Crag',
  other: 'Other',
};

export function isPinKind(value: string): value is PinKind {
  return (PIN_KINDS as readonly string[]).includes(value);
}
