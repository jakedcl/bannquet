import { MAP_GROUPS, isActivity, mapGroupForActivity, type MapGroup } from '@/lib/activities';

export type LeaderStat = {
  userId: string;
  name: string;
  handle: string | null;
  activity: string;
  distanceM: number;
  elevGainM: number;
  summits: number;
};

export type LeaderRow = {
  userId: string;
  name: string;
  handle: string | null;
  distanceM: number;
  elevGainM: number;
  summits: number;
};

export function buildLeaderboards(rows: LeaderStat[]): Record<MapGroup, LeaderRow[]> {
  const boards: Record<MapGroup, Map<string, LeaderRow>> = {
    foot: new Map(),
    bike: new Map(),
    snow: new Map(),
  };

  for (const row of rows) {
    if (!isActivity(row.activity)) continue;
    const group = mapGroupForActivity(row.activity);
    const current = boards[group].get(row.userId) ?? {
      userId: row.userId,
      name: row.name,
      handle: row.handle,
      distanceM: 0,
      elevGainM: 0,
      summits: 0,
    };
    current.distanceM += Math.max(0, row.distanceM);
    current.elevGainM += Math.max(0, row.elevGainM);
    current.summits += Math.max(0, row.summits);
    current.name = row.name || current.name;
    current.handle = row.handle ?? current.handle;
    boards[group].set(row.userId, current);
  }

  const sort = (left: LeaderRow, right: LeaderRow) =>
    right.distanceM - left.distanceM || right.elevGainM - left.elevGainM || right.summits - left.summits || left.name.localeCompare(right.name);

  return {
    foot: [...boards.foot.values()].filter(hasAnything).sort(sort),
    bike: [...boards.bike.values()].filter(hasAnything).sort(sort),
    snow: [...boards.snow.values()].filter(hasAnything).sort(sort),
  };
}

function hasAnything(row: LeaderRow): boolean {
  return row.distanceM > 0 || row.elevGainM > 0 || row.summits > 0;
}

export const LEADER_GROUPS = (Object.keys(MAP_GROUPS) as MapGroup[]).map((id) => ({
  id,
  label: MAP_GROUPS[id].label,
}));
