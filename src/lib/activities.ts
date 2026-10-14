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
    label: 'On foot',
    color: '#c0392b',
    activities: ['hike', 'walk', 'run', 'trail_run'],
  },
  bike: {
    label: 'Biking',
    color: '#1f4e9c',
    activities: ['bike'],
  },
  snow: {
    label: 'Ski / snowboard',
    color: '#e67e22',
    activities: ['ski', 'snowboard'],
  },
} as const satisfies Record<string, { label: string; color: string; activities: readonly Activity[] }>;

export type MapGroup = keyof typeof MAP_GROUPS;

export const ACTIVITY_META: Record<Activity, { label: string; icon: string; group: MapGroup }> = {
  hike: { label: 'Hike', icon: 'boot', group: 'foot' },
  walk: { label: 'Walk', icon: 'shoe', group: 'foot' },
  run: { label: 'Run', icon: 'sneaker', group: 'foot' },
  trail_run: { label: 'Trail run', icon: 'sneaker', group: 'foot' },
  bike: { label: 'Bike', icon: 'bike', group: 'bike' },
  ski: { label: 'Ski', icon: 'skis', group: 'snow' },
  snowboard: { label: 'Snowboard', icon: 'snowboard', group: 'snow' },
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

export type ActivityTally = {
  activity: Activity;
  count: number;
  latest: string;
};

/** Every logged activity, highest count first. A tie goes to the latest upload, then the name. */
export function sortLoggedActivities(rows: ActivityTally[]): ActivityTally[] {
  return rows.filter((row) => row.count > 0 && isActivity(row.activity)).slice().sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (a.latest !== b.latest) return a.latest < b.latest ? 1 : -1;
    return a.activity < b.activity ? -1 : a.activity > b.activity ? 1 : 0;
  });
}

/** Highest count wins. A tie goes to the latest upload, then the activity name. */
export function pickMostDoneActivity(rows: ActivityTally[]): ActivityTally | null {
  return sortLoggedActivities(rows)[0] ?? null;
}
