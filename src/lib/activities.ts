export const ACTIVITIES = [
  'hike',
  'walk',
  'run',
  'trail_run',
  'bike',
  'ski',
  'snowboard',
] as const;

export type Activity = (typeof ACTIVITIES)[number];

export const MAP_GROUPS = {
  foot: {
    label: 'Foot',
    color: '#2d5016',
    activities: ['hike', 'walk', 'run', 'trail_run'],
  },
  wheels: {
    label: 'Wheels / snow',
    color: '#1f4e9c',
    activities: ['bike', 'ski', 'snowboard'],
  },
} as const satisfies Record<string, { label: string; color: string; activities: readonly Activity[] }>;

export type MapGroup = keyof typeof MAP_GROUPS;

export const ACTIVITY_META: Record<Activity, { label: string; icon: string; group: MapGroup }> = {
  hike: { label: 'Hike', icon: 'boot', group: 'foot' },
  walk: { label: 'Walk', icon: 'shoe', group: 'foot' },
  run: { label: 'Run', icon: 'sneaker', group: 'foot' },
  trail_run: { label: 'Trail run', icon: 'sneaker', group: 'foot' },
  bike: { label: 'Bike', icon: 'bike', group: 'wheels' },
  ski: { label: 'Ski', icon: 'skis', group: 'wheels' },
  snowboard: { label: 'Snowboard', icon: 'snowboard', group: 'wheels' },
};

export function mapGroupForActivity(activity: Activity): MapGroup {
  return ACTIVITY_META[activity].group;
}

export function mapColorForActivity(activity: Activity): string {
  return MAP_GROUPS[mapGroupForActivity(activity)].color;
}

export function isActivity(value: string): value is Activity {
  return (ACTIVITIES as readonly string[]).includes(value);
}
